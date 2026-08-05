import { useRef } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AUDIO_TRANSCRIPTION_QUEUE_URL } from './recordingConstants';
import { generateToken, getAwsCredentials } from './recordingAuth';

const createUploadError = (stage, error) => {
  const uploadError = new Error(`Recording ${stage} failed`);
  uploadError.name = 'RecordingUploadError';
  uploadError.stage = stage;
  uploadError.cause = error;
  return uploadError;
};

function useAudioUploadQueue({
  filePathRef,
  onFinalAudioQueued,
  onUploadError
}) {
  const uploadQueueRef = useRef([]);
  const isProcessingUploadsRef = useRef(false);
  const activeSessionIdRef = useRef(null);
  const sessionGenerationRef = useRef(0);
  const activeUploadTaskRef = useRef(null);
  const activeSqsAbortControllerRef = useRef(null);

  const cancelActiveWork = () => {
    if (activeUploadTaskRef.current) {
      try {
        activeUploadTaskRef.current.cancel('Recording session cancelled');
      } catch (error) {
        console.warn('Unable to cancel active recording upload:', error);
      }
      activeUploadTaskRef.current = null;
    }

    if (activeSqsAbortControllerRef.current) {
      activeSqsAbortControllerRef.current.abort();
      activeSqsAbortControllerRef.current = null;
    }
  };

  const invalidateCurrentSession = () => {
    sessionGenerationRef.current += 1;
    uploadQueueRef.current = [];
    isProcessingUploadsRef.current = false;
    cancelActiveWork();
  };

  const startUploadSession = (sessionId) => {
    invalidateCurrentSession();
    activeSessionIdRef.current = sessionId;
  };

  const cancelUploadSession = (sessionId = activeSessionIdRef.current) => {
    if (sessionId && activeSessionIdRef.current !== sessionId) {
      return;
    }

    activeSessionIdRef.current = null;
    invalidateCurrentSession();
  };

  const isSessionActive = (sessionId, generation) => (
    activeSessionIdRef.current === sessionId &&
    sessionGenerationRef.current === generation
  );

  const uploadS3 = async (item, generation) => {
    const {
      audioBlob,
      contentType,
      filePath,
      isFinalAudio,
      sessionId,
      timestamp,
      userId
    } = item;

    let stage = 'authentication';

    try {
      const credentials = await getAwsCredentials();
      if (!credentials) {
        throw new Error('AWS credentials are unavailable');
      }
      if (!isSessionActive(sessionId, generation)) {
        return { cancelled: true };
      }

      const accessToken = await generateToken();
      if (!isSessionActive(sessionId, generation)) {
        return { cancelled: true };
      }

      stage = 'upload';
      const uploadTask = uploadData({
        path: filePath,
        data: audioBlob,
        options: {
          contentType,
          metadata: {
            timestamp: timestamp.toString(),
            userId
          }
        }
      });
      activeUploadTaskRef.current = uploadTask;

      let uploadResult;
      try {
        uploadResult = await uploadTask.result;
      } finally {
        if (activeUploadTaskRef.current === uploadTask) {
          activeUploadTaskRef.current = null;
        }
      }

      if (!isSessionActive(sessionId, generation)) {
        return { cancelled: true };
      }

      filePathRef.current = filePath;
      console.log(`Successfully uploaded recording audio to: ${filePath}`);

      const selectedLanguage = localStorage.getItem('selectedLanguage');
      const messageBody = JSON.stringify({
        userId,
        timestamp,
        path: filePath,
        language: selectedLanguage === 'null' ? null : selectedLanguage,
        isFinalAudio,
        accessToken,
        noteSettings: localStorage.getItem('noteSettings')
      });

      const filenameParts = filePath.split('/');
      const lastPart = filenameParts[filenameParts.length - 1];
      const deduplicationId = `${userId.substring(0, 8)}-${timestamp}-${lastPart}`.replace(/[^a-zA-Z0-9\-_]/g, '');

      const command = new SendMessageCommand({
        QueueUrl: AUDIO_TRANSCRIPTION_QUEUE_URL,
        MessageBody: messageBody,
        MessageGroupId: userId,
        MessageDeduplicationId: deduplicationId
      });

      stage = 'queue notification';
      const sqsAbortController = new AbortController();
      activeSqsAbortControllerRef.current = sqsAbortController;

      let sqsResult;
      try {
        const sqsClient = new SQSClient({
          region: 'us-east-2',
          credentials
        });
        sqsResult = await sqsClient.send(command, {
          abortSignal: sqsAbortController.signal
        });
      } finally {
        if (activeSqsAbortControllerRef.current === sqsAbortController) {
          activeSqsAbortControllerRef.current = null;
        }
      }

      if (!isSessionActive(sessionId, generation)) {
        return { cancelled: true };
      }

      console.log('Successfully sent recording message to SQS:', sqsResult.MessageId);
      if (isFinalAudio) {
        onFinalAudioQueued(userId, timestamp);
      }

      return { uploadResult };
    } catch (error) {
      if (!isSessionActive(sessionId, generation)) {
        return { cancelled: true };
      }
      throw createUploadError(stage, error);
    }
  };

  const processUploadQueue = async () => {
    if (isProcessingUploadsRef.current || uploadQueueRef.current.length === 0) {
      return;
    }

    const sessionId = activeSessionIdRef.current;
    const generation = sessionGenerationRef.current;
    isProcessingUploadsRef.current = true;

    try {
      while (
        isSessionActive(sessionId, generation) &&
        uploadQueueRef.current.length > 0
      ) {
        const item = uploadQueueRef.current[0];
        const result = await uploadS3(item, generation);

        if (result?.cancelled || !isSessionActive(sessionId, generation)) {
          return;
        }

        if (uploadQueueRef.current[0] === item) {
          uploadQueueRef.current.shift();
        }
      }
    } catch (error) {
      if (isSessionActive(sessionId, generation)) {
        uploadQueueRef.current = [];
        activeSessionIdRef.current = null;
        console.error('Recording upload queue failed:', error);
        onUploadError(error);
      }
    } finally {
      if (sessionGenerationRef.current === generation) {
        isProcessingUploadsRef.current = false;
      }
    }
  };

  const queueUpload = (audioBlob, filePath, {
    contentType,
    sessionId,
    timestamp,
    userId
  }) => {
    if (activeSessionIdRef.current !== sessionId) {
      return false;
    }

    uploadQueueRef.current.push({
      audioBlob,
      contentType,
      filePath,
      isFinalAudio: filePath.includes('_final_'),
      sessionId,
      timestamp,
      userId
    });
    processUploadQueue();
    return true;
  };

  return {
    queueUpload,
    startUploadSession,
    cancelUploadSession
  };
}

export default useAudioUploadQueue;
