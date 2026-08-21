import { useRef } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AUDIO_TRANSCRIPTION_QUEUE_URL } from './recordingConstants';
import { generateToken, getAwsCredentials, getUserId } from './recordingAuth';

export const getNextUploadItem = (uploadQueue) => (
  uploadQueue.find(item => !item.filePath.includes('_final_')) ||
  uploadQueue.find(item => item.filePath.includes('_final_'))
);

function useAudioUploadQueue({
  timeStampRef,
  filePathRef,
  onFinalAudioQueued
}) {
  const uploadQueueRef = useRef([]);
  const isProcessingUploadsRef = useRef(false);

  const uploadS3 = async (audioBlob, filePath) => {
    const timestamp = timeStampRef.current;
    const userId = await getUserId();

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

      console.log(`Successfully uploaded to: ${filePath}`, uploadResult);

      const selectedLanguage = localStorage.getItem('selectedLanguage');
      const messageBody = JSON.stringify({
        userId,
        timestamp,
        path: filePath,
        language: selectedLanguage === 'null' ? null : selectedLanguage,
        isFinalAudio: filePath.includes('_final_'),
        accessToken,
        noteSettings: localStorage.getItem('noteSettings')
      });

      const filenameParts = filePath.split('/');
      const lastPart = filenameParts[filenameParts.length - 1];
      const deduplicationId = `${userId.substring(0, 8)}-${timestamp}-${lastPart}`.replace(/[^a-zA-Z0-9\-_]/g, '');
      console.log('Deduplication ID:', deduplicationId);

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
          onFinalAudioQueued(userId, timestamp);
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

        await uploadS3(item.audioBlob, item.filePath);
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

  const queueUpload = (audioBlob, filePath) => {
    uploadQueueRef.current.push({ audioBlob, filePath });
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
