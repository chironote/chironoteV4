import { useRef } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AUDIO_TRANSCRIPTION_QUEUE_URL } from './recordingConstants';
import { generateToken, getAwsCredentials, getUserId } from './recordingAuth';

export const getNextUploadItem = (uploadQueue) => (
  uploadQueue.find(item => !item.filePath.includes('_final_')) ||
  uploadQueue.find(item => item.filePath.includes('_final_'))
);

export const getAudioObjectIdentity = (filePath) => {
  const fileName = filePath.split('/').pop() || '';
  const match = fileName.match(/_recording_(?:chunk|final)_(.+)_(\d+)\.webm$/);

  if (!match) {
    return {};
  }

  const recordingJobId = match[1];
  const chunkOrder = Number(match[2]);
  return {
    chunkId: `${recordingJobId}-${chunkOrder}`,
    chunkOrder,
    recordingJobId
  };
};

function useAudioUploadQueue({
  timeStampRef,
  filePathRef,
  onFinalAudioQueued
}) {
  const uploadQueueRef = useRef([]);
  const isProcessingUploadsRef = useRef(false);

  const uploadS3 = async (audioBlob, filePath, capture) => {
    const timestamp = capture?.timestamp ?? timeStampRef.current;
    const userId = capture?.userId ?? await getUserId();

    if (!userId) {
      console.error('User not authenticated for S3 upload');
      return null;
    }

    filePathRef.current = filePath;

    try {
      const credentials = await getAwsCredentials();
      if (!credentials) {
        console.error('AWS Credentials not found in session');
        return null;
      }

      const accessToken = await generateToken();
      const sqsClient = new SQSClient({
        region: 'us-east-2',
        credentials
      });

      const uploadResult = await uploadData({
        path: filePath,
        data: audioBlob,
        options: {
          contentType: 'audio/webm',
          metadata: {
            timestamp: timestamp.toString(),
            userId
          }
        }
      }).result;



      const audioObjectIdentity = getAudioObjectIdentity(filePath);
      const messageBody = JSON.stringify({
        userId,
        timestamp,
        path: filePath,
        language: 'auto',
        isFinalAudio: filePath.includes('_final_'),
        accessToken,
        noteSettings: capture?.noteSettings ?? localStorage.getItem('noteSettings'),
        ...(capture?.visitMetadata ? { visitMetadata: capture.visitMetadata } : {}),
        ...audioObjectIdentity
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

      try {
        const data = await sqsClient.send(command);
        console.log('Successfully sent message to SQS:', data.MessageId);
        console.log(`Queue notified of new audio segment. Is final? ${filePath.includes('_final_') ? 'True' : 'False'}`);

        if (filePath.includes('_final_')) {
          console.log('Final recording uploaded, waiting for transcript completion...');
          onFinalAudioQueued(userId, timestamp, capture);
        }
      } catch (error) {
        console.error('Error sending message to SQS:', error);
      }

      return uploadResult;
    } catch (error) {
      console.error('Error uploading audio to S3:', error);
      throw error;
    }
  };

  const processUploadQueue = async () => {
    if (isProcessingUploadsRef.current || uploadQueueRef.current.length === 0) {
      return;
    }

    isProcessingUploadsRef.current = true;

    try {
      while (uploadQueueRef.current.length > 0) {
        const item = getNextUploadItem(uploadQueueRef.current);
        if (!item) {
          break;
        }

        await uploadS3(item.audioBlob, item.filePath, item.capture);
        uploadQueueRef.current = uploadQueueRef.current.filter(queueItem => queueItem !== item);
      }
    } catch (error) {
      console.error('Error processing upload queue:', error);
    } finally {
      isProcessingUploadsRef.current = false;

      if (uploadQueueRef.current.length > 0) {
        processUploadQueue();
      }
    }
  };

  const queueUpload = (audioBlob, filePath, capture) => {
    uploadQueueRef.current.push({ audioBlob, filePath, capture });
    processUploadQueue();
  };

  const clearUploadQueue = () => {
    uploadQueueRef.current = [];
    isProcessingUploadsRef.current = false;
  };

  return {
    queueUpload,
    clearUploadQueue
  };
}

export default useAudioUploadQueue;
