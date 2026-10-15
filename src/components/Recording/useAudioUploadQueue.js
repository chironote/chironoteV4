import { useEffect, useRef, useState } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AUDIO_TRANSCRIPTION_QUEUE_URL } from './recordingConstants';
import { getRecordingAuth } from './recordingAuth';

export const getAudioObjectIdentity = (filePath) => {
  const match = (filePath.split('/').pop() || '').match(/_recording_(?:chunk|final)_(.+)_(\d+)\.webm$/);
  if (!match) return {};
  const recordingJobId = match[1];
  const chunkOrder = Number(match[2]);
  return { chunkId: `${recordingJobId}-${chunkOrder}`, chunkOrder, recordingJobId };
};

const sessionKey = item => item.capture?.timestamp ?? getAudioObjectIdentity(item.filePath).recordingJobId ?? 'legacy';
const isFinal = item => item.filePath.includes('_final_');
export const getNextUploadItem = (queue, now = Date.now()) => queue.find(item => {
  if (item.blocked || item.cancelled || (item.retryAt || 0) > now) return false;
  const peers = queue.filter(peer => sessionKey(peer) === sessionKey(item));
  const regular = peers.filter(peer => !isFinal(peer));
  return regular.length ? regular[0] === item : peers[0] === item;
});

export const isBlockedUploadError = error => {
  const name = error?.name || error?.code || '';
  const status = error?.$metadata?.httpStatusCode;
  if (/ExpiredToken|InvalidToken|UnrecognizedClient|NotAuthorized|AuthUnavailable|Network|Timeout|Abort|Throttl|TooMany/i.test(name)) return false;
  return /RecordingOwnerMismatch|AccessDenied|Unauthorized|Validation|InvalidParameter|InvalidAddress|NonExistentQueue|EntityTooLarge/i.test(name) ||
    (status >= 400 && status < 500 && ![401, 408, 429].includes(status));
};

// One worker also owns cancellation settlement. An online hint or discard must
// never release its lock while an SDK attempt is still alive.
export function createAudioUploadQueue({ onFinalAudioQueued, onStatus = () => {} }) {
  let queue = [];
  let running = false;
  let disposed = false;
  let timer = null;
  const completed = new Set();
  const discarded = new Set();
  const report = () => onStatus(queue.some(item => item.blocked)
    ? 'Audio submission is blocked. Audio stays in memory in this open app. Check the original account or connection, then retry.'
    : queue.length ? 'Audio is pending in this open app. Connection failures retry automatically.' : '');

  const upload = async item => {
    let transferred = 0;
    let watchdog;
    let stalled = false;
    let settled = false;
    let task;
    const cancel = () => task.cancel();
    const armWatchdog = () => {
      clearTimeout(watchdog);
      watchdog = setTimeout(() => { stalled = true; cancel(); }, 120000);
    };
    task = uploadData({
      path: item.filePath, data: item.audioBlob,
      options: {
        contentType: 'audio/webm',
        metadata: { timestamp: String(item.capture.timestamp), userId: item.capture.userId },
        onProgress: ({ transferredBytes }) => {
          if (!settled && !stalled && !item.cancelled && transferredBytes > transferred) {
            transferred = transferredBytes;
            armWatchdog();
          }
        }
      }
    });
    item.cancel = cancel;
    armWatchdog();
    try {
      await task.result;
      // Cancellation can race a resolved SDK result. An ambiguous stall resends
      // the same bytes/key; discarded work must never proceed to dispatch.
      if (stalled) throw Object.assign(new Error('Upload made no progress.'), { name: 'TimeoutError' });
      if (!item.cancelled) item.stage = 'dispatch-pending';
    } finally { settled = true; clearTimeout(watchdog); item.cancel = null; }
  };

  const dispatch = async (item, auth) => {
    const { userId, timestamp, noteSettings, visitMetadata } = item.capture;
    const name = item.filePath.split('/').pop();
    const client = new SQSClient({ region: 'us-east-2', credentials: auth.credentials, maxAttempts: 1 });
    const abort = new AbortController();
    item.cancel = () => abort.abort();
    const timeout = setTimeout(() => abort.abort(), 60000);
    try {
      await client.send(new SendMessageCommand({
        QueueUrl: AUDIO_TRANSCRIPTION_QUEUE_URL,
        MessageBody: JSON.stringify({
          userId, timestamp, path: item.filePath, language: 'auto', isFinalAudio: isFinal(item),
          accessToken: auth.accessToken, noteSettings,
          ...(visitMetadata ? { visitMetadata } : {}), ...getAudioObjectIdentity(item.filePath)
        }),
        MessageGroupId: userId,
        MessageDeduplicationId: `${userId.substring(0, 8)}-${timestamp}-${name}`.replace(/[^a-zA-Z0-9\-_]/g, '')
      }), { abortSignal: abort.signal });
      if (!item.cancelled) item.stage = 'acknowledged';
    } finally { clearTimeout(timeout); item.cancel = null; client.destroy(); }
  };

  const acknowledge = item => {
    queue = queue.filter(peer => peer !== item);
    item.audioBlob = null;
    const key = sessionKey(item);
    if (isFinal(item) && !completed.has(key)) {
      completed.add(key);
      // Completion errors cannot retry an acknowledged dispatch. The retained
      // item and discard fence belong to this recording, independent of the worker.
      Promise.resolve().then(() => {
        if (!disposed && !discarded.has(key)) return onFinalAudioQueued(item.capture.userId, item.capture.timestamp, item.capture);
      }).catch(() => onStatus('Audio submitted; note completion could not be started. Check Recent Notes.'));
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    if (disposed || running) return;
    if (getNextUploadItem(queue)) { timer = setTimeout(process, 0); return; }
    const retryTimes = queue.filter(item => !item.blocked && item.retryAt > Date.now()).map(item => item.retryAt);
    if (retryTimes.length) timer = setTimeout(process, Math.max(0, Math.min(...retryTimes) - Date.now()));
  };

  const process = async () => {
    if (running || disposed) return;
    running = true;
    try {
      let item;
      while (!disposed && (item = getNextUploadItem(queue))) {
        try {
          const owner = item.capture.userId;
          if (item.stage === 'upload-pending') {
            await getRecordingAuth(owner, item.failures > 0);
            if (!item.cancelled && !disposed) await upload(item);
          }
          if (!item.cancelled && !disposed && item.stage === 'dispatch-pending') {
            // Transfers can take minutes. Read current dispatch auth afterwards.
            const auth = await getRecordingAuth(owner, item.failures > 0);
            if (!item.cancelled && !disposed) await dispatch(item, auth);
          }
          if (!item.cancelled && !disposed && item.stage === 'acknowledged') {
            acknowledge(item);
          }
        } catch (error) {
          if (!item.cancelled && !disposed) {
            item.failures++;
            const rejectedToken = /NotAuthorized|ExpiredToken|InvalidToken|UnrecognizedClient/i.test(error?.name || '');
            item.authFailures = rejectedToken ? (item.authFailures || 0) + 1 : 0;
            item.blocked = isBlockedUploadError(error) || item.authFailures >= 3;
            const ceiling = Math.min(60000, 1000 * (2 ** Math.min(item.failures - 1, 6)));
            item.retryAt = Date.now() + Math.max(1, Math.floor(Math.random() * ceiling));
          }
        }
        report();
      }
    } finally { running = false; schedule(); }
  };

  return {
    enqueue(audioBlob, filePath, capture) {
      if (disposed || discarded.has(capture.timestamp)) return;
      queue.push({ audioBlob, filePath, capture: Object.freeze({ ...capture }), stage: 'upload-pending', failures: 0, retryAt: 0 });
      report(); schedule();
    },
    clear(timestamp) {
      if (timestamp === undefined) disposed = true;
      else discarded.add(timestamp);
      for (const item of queue) {
        if (timestamp === undefined || sessionKey(item) === timestamp) { item.cancelled = true; item.cancel?.(); }
      }
      queue = queue.filter(item => !item.cancelled);
      report(); schedule();
    },
    retry() {
      for (const item of queue) { item.blocked = false; item.retryAt = 0; }
      report(); schedule();
    },
    wake() { schedule(); },
    snapshot() { return queue.slice(); }
  };
}

function useAudioUploadQueue({ onFinalAudioQueued }) {
  const [uploadStatus, setUploadStatus] = useState('');
  const callbackRef = useRef(onFinalAudioQueued);
  callbackRef.current = onFinalAudioQueued;
  const queueRef = useRef(null);
  const makeQueue = () => createAudioUploadQueue({
    onFinalAudioQueued: (...args) => callbackRef.current(...args), onStatus: setUploadStatus
  });
  if (!queueRef.current) queueRef.current = makeQueue();
  useEffect(() => {
    if (!queueRef.current) queueRef.current = makeQueue();
    const queue = queueRef.current;
    window.addEventListener('online', queue.wake);
    return () => { window.removeEventListener('online', queue.wake); queue.clear(); queueRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    queueUpload: (...args) => queueRef.current?.enqueue(...args),
    clearUploadQueue: (...args) => queueRef.current?.clear(...args),
    retryUploads: () => queueRef.current?.retry(), uploadStatus
  };
}

export default useAudioUploadQueue;
