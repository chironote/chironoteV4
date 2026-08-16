import { useRef } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AUDIO_TRANSCRIPTION_QUEUE_URL } from './recordingConstants';
import { generateToken, getAwsCredentials } from './recordingAuth';
import { RECORDING_TELEMETRY_SCHEMA_VERSION, toSafeErrorCode } from './recordingTelemetrySchema';
import { createTranscriptionMessage } from './recordingBackendContract';

const createUploadError = (stage, error) => {
  const uploadError = new Error(`Recording ${stage} failed`);
  uploadError.name = 'RecordingUploadError';
  uploadError.stage = stage;
  uploadError.cause = error;
  return uploadError;
};

function useAudioUploadQueue({
  filePathRef,
  emitTelemetry = () => {},
  telemetryContext = {},
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
        console.warn(`Unable to cancel active recording upload (${toSafeErrorCode(error, 'cancel_failed')})`);
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
      chunkOrder,
      contentType,
      filePath,
      isFinalAudio,
      recordingJobId,
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
      const uploadStartedAt = Date.now();
      emitTelemetry('upload.started', {
        attempt: 1,
        chunkBytes: audioBlob.size,
        chunkOrder,
        isFinalChunk: isFinalAudio,
        mimeType: contentType,
        provider: 's3'
      }, recordingJobId);
      const uploadTask = uploadData({
        path: filePath,
        data: audioBlob,
        options: {
          contentType,
          metadata: {
            appBuild: telemetryContext.appBuild,
            chunkOrder: chunkOrder.toString(),
            recordingJobId,
            recordingBrowser: telemetryContext.browser,
            recordingPlatform: telemetryContext.platform,
            telemetrySchemaVersion: RECORDING_TELEMETRY_SCHEMA_VERSION,
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
      console.log('Successfully uploaded recording audio');
      emitTelemetry('upload.succeeded', {
        attempt: 1,
        chunkBytes: audioBlob.size,
        chunkOrder,
        durationMs: Math.max(0, Date.now() - uploadStartedAt),
        isFinalChunk: isFinalAudio,
        mimeType: contentType,
        provider: 's3',
        s3RequestId: uploadResult?.$metadata?.requestId
      }, recordingJobId);

      const selectedLanguage = localStorage.getItem('selectedLanguage');
      const messageBody = JSON.stringify(createTranscriptionMessage({
        accessToken,
        chunkBytes: audioBlob.size,
        chunkOrder,
        contentType,
        isFinalAudio,
        language: selectedLanguage === 'null' ? null : selectedLanguage,
        noteSettings: localStorage.getItem('noteSettings'),
        path: filePath,
        recordingJobId,
        telemetryContext,
        timestamp,
        userId
      }));

      const filenameParts = filePath.split('/');
      const lastPart = filenameParts[filenameParts.length - 1];
      const deduplicationId = `${recordingJobId}-${lastPart}`.replace(/[^a-zA-Z0-9\-_]/g, '');

      const command = new SendMessageCommand({
        QueueUrl: AUDIO_TRANSCRIPTION_QUEUE_URL,
        MessageBody: messageBody,
        MessageGroupId: recordingJobId,
        MessageDeduplicationId: deduplicationId
      });

      stage = 'queue notification';
      const queueStartedAt = Date.now();
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
      emitTelemetry('sqs.accepted', {
        attempt: 1,
        awsRequestId: sqsResult?.$metadata?.requestId,
        chunkBytes: audioBlob.size,
        chunkOrder,
        durationMs: Math.max(0, Date.now() - queueStartedAt),
        isFinalChunk: isFinalAudio,
        provider: 'sqs',
        sqsMessageId: sqsResult.MessageId
      }, recordingJobId);
      if (isFinalAudio) {
        onFinalAudioQueued(userId, timestamp, recordingJobId);
      }

      return { uploadResult };
    } catch (error) {
      if (!isSessionActive(sessionId, generation)) {
        return { cancelled: true };
      }
      emitTelemetry(stage === 'queue notification' ? 'sqs.failed' : 'upload.failed', {
        attempt: 1,
        chunkBytes: audioBlob.size,
        chunkOrder,
        errorCode: toSafeErrorCode(
          error,
          stage === 'authentication'
            ? 'authentication_failed'
            : (stage === 'upload' ? 'upload_failed' : 'sqs_failed')
        ),
        isFinalChunk: isFinalAudio,
        provider: stage === 'upload' ? 's3' : (stage === 'queue notification' ? 'sqs' : 'aws_auth'),
        reasonCode: stage.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      }, recordingJobId);
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
        console.error(`Recording upload queue failed (${toSafeErrorCode(error, 'upload_queue_failed')})`);
        onUploadError(error);
      }
    } finally {
      if (sessionGenerationRef.current === generation) {
        isProcessingUploadsRef.current = false;
      }
    }
  };

  const queueUpload = (audioBlob, filePath, {
    chunkOrder = 0,
    contentType,
    sessionId,
    recordingJobId = sessionId,
    timestamp,
    userId
  }) => {
    if (activeSessionIdRef.current !== sessionId) {
      return false;
    }

    uploadQueueRef.current.push({
      audioBlob,
      chunkOrder,
      contentType,
      filePath,
      isFinalAudio: filePath.includes('_final_'),
      recordingJobId,
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
