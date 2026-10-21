import { useRef } from 'react';
import { generateClient } from 'aws-amplify/api';
import * as subscriptions from '../../graphql/subscriptions';
import {
  NOTE_GENERATION_RETRY_MESSAGE,
  NOTE_GENERATION_TIMEOUT_AFTER_TRANSCRIPT_FALLBACK_MS,
  NOTE_GENERATION_TIMEOUT_MS,
  NOTE_GENERATION_URL,
  TRANSCRIPT_WAIT_TIMEOUT_MS
} from './recordingConstants';
import { generateToken, getUserId } from './recordingAuth';
import { createNoteGenerationStreamParser, parseLambdaErrorPayload } from './noteGenerationErrors';
import { patientNotesEnabled, patientRequest } from '../../services/patientNotes';

const client = generateClient();

function createNoteGeneration({
  onGenerationStateChange,
  onGenerationError,
  onSavedNoteReady,
  onSettled,
  isDiscardingRef,
  noSleepRef,
  setTextStream,
  setIsPreparingTranscript,
  setIsGeneratingSummary,
  setIsTranscriptCompleted,
  onTextStreamUpdate,
  onTransitionToMainApp
}) {
  const captureRef = ref(null);
  const runRef = ref(0);
  const previewRef = ref('');
  const subscriptionRef = ref(null);
  const generateTimeoutRef = ref(null);
  const transcriptFallbackTimeoutRef = ref(null);
  const hasStartedStreamingRef = ref(false);
  const hasHandledNoteGenerationFailureRef = ref(false);
  const generateAbortControllerRef = ref(null);

  const cleanupNoteGeneration = () => {
    runRef.current++;
    isDiscardingRef.current = true;
    if (transcriptFallbackTimeoutRef.current) {
      clearTimeout(transcriptFallbackTimeoutRef.current);
      transcriptFallbackTimeoutRef.current = null;
    }
    if (generateTimeoutRef.current) {
      clearTimeout(generateTimeoutRef.current);
      generateTimeoutRef.current = null;
    }
    if (generateAbortControllerRef.current) {
      generateAbortControllerRef.current.abort();
      generateAbortControllerRef.current = null;
    }
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  };

  const handleNoteGenerationFailure = (
    reason,
    error = null,
    userMessage = NOTE_GENERATION_RETRY_MESSAGE
  ) => {
    if (hasHandledNoteGenerationFailureRef.current || isDiscardingRef.current) {
      return;
    }

    hasHandledNoteGenerationFailureRef.current = true;
    console.warn('Note generation failed:', reason);
    if (generateAbortControllerRef.current) {
      generateAbortControllerRef.current.abort();
      generateAbortControllerRef.current = null;
    }
    const message = error?.safeMessage || userMessage;
    setTextStream(previewRef.current);
    onTextStreamUpdate(previewRef.current);
    onGenerationError?.(previewRef.current ? `Saving could not be confirmed. Keep this preview and check saved notes before retrying. ${message}` : message);
    setIsGeneratingSummary(false);
    setIsPreparingTranscript(false);
    onTransitionToMainApp();
    if (generateTimeoutRef.current) {
      clearTimeout(generateTimeoutRef.current);
      generateTimeoutRef.current = null;
    }
    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }
  };

  const streamResponse = async ({ fromTranscriptFallback = false } = {}) => {
    if (hasStartedStreamingRef.current) {
      console.log('streamResponse already started, skipping duplicate trigger');
      return;
    }

    hasStartedStreamingRef.current = true;
    const run = ++runRef.current;
    const active = () => run === runRef.current && !isDiscardingRef.current;
    const capture = captureRef?.current;
    const timestamp = capture.timestamp;
    onGenerationStateChange?.(true);
    hasHandledNoteGenerationFailureRef.current = false;
    if (transcriptFallbackTimeoutRef.current) {
      clearTimeout(transcriptFallbackTimeoutRef.current);
      transcriptFallbackTimeoutRef.current = null;
    }

    setIsGeneratingSummary(true);
    setIsPreparingTranscript(false);
    previewRef.current = '';
    onGenerationError?.('');
    onTextStreamUpdate('');

    if (generateAbortControllerRef.current) {
      generateAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    generateAbortControllerRef.current = abortController;

    const generationTimeoutMs = fromTranscriptFallback
      ? NOTE_GENERATION_TIMEOUT_AFTER_TRANSCRIPT_FALLBACK_MS
      : NOTE_GENERATION_TIMEOUT_MS;

    generateTimeoutRef.current = setTimeout(() => {
      console.warn(`Generating Note timeout (${generationTimeoutMs / 1000} seconds) - closing spinner and returning to main app`);
      if (active()) handleNoteGenerationFailure('timeout');
    }, generationTimeoutMs);

    try {
      const userId = await getUserId();
      if (userId !== capture.userId) throw new Error('Recording account has changed.');
      if (!active()) return;
      if (!userId) {
        handleNoteGenerationFailure('user_not_authenticated');
        return;
      }
      const accessToken = await generateToken();
      if (!active()) return;

      const response = await fetch(NOTE_GENERATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          timeStamp: timestamp,
          accessToken,
          noteSettings: capture?.noteSettings ?? localStorage.getItem('noteSettings'),
          ...(capture?.visitMetadata ? { visitMetadata: capture.visitMetadata } : {})
        }),
        signal: abortController.signal
      });

      if (!active()) return;
      if (!response.ok) {
        handleNoteGenerationFailure(`http_${response.status}`);
        return;
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        const responseBody = await response.text();
        const lambdaError = parseLambdaErrorPayload(responseBody);
        if (lambdaError) {
          handleNoteGenerationFailure('lambda_json_error_response', lambdaError);
          return;
        }
      }

      if (!response.body) {
        handleNoteGenerationFailure('missing_stream_body');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      const parseStream = createNoteGenerationStreamParser();
      const applySavedNote = async () => {
        const saved = await patientRequest('getSavedNote', { timestamp: String(timestamp) });
        if (!active() || hasHandledNoteGenerationFailureRef.current) return;
        if (!saved.note?.ready || !saved.note.version || typeof saved.note.note !== 'string' ||
            String(saved.note.timestamp) !== String(timestamp)) throw new Error('The saved result could not be confirmed.');
        previewRef.current = saved.note.note;
        setTextStream(saved.note.note); onTextStreamUpdate(saved.note.note); onSavedNoteReady?.(saved.note);
      };

      setIsGeneratingSummary(false);
      onTransitionToMainApp();

      while (true) {
        if (!active() || hasHandledNoteGenerationFailureRef.current) {
          try {
            await reader.cancel();
          } catch (cancelError) {
            console.warn('Error cancelling note generation stream reader:', cancelError);
          }
          break;
        }

        const chunk = await reader.read();
        if (!active()) return;
        const frame = parseStream(decoder.decode(chunk.value, { stream: !chunk.done }), chunk.done);
        previewRef.current += frame.text;
        const lambdaError = frame.error || parseLambdaErrorPayload(previewRef.current);
        if (lambdaError) {
          if (lambdaError.code === 'NOTE_RECOVERED') await applySavedNote();
          else handleNoteGenerationFailure('lambda_stream_chunk_error', lambdaError);
          Promise.resolve().then(() => reader.cancel()).catch(() => {});
          break;
        }
        if (frame.text) {
          setTextStream(previewRef.current);
          onTextStreamUpdate(previewRef.current);
        }
        if (chunk.done) {
          if (patientNotesEnabled && !hasHandledNoteGenerationFailureRef.current) await applySavedNote();
          break;
        }
      }
    } catch (error) {
      if (active() && error?.name !== 'AbortError') {
        handleNoteGenerationFailure('streaming_exception', error);
      }
    } finally {
      if (!active()) return;
      onGenerationStateChange?.(false);
      setIsGeneratingSummary(false);
      setIsPreparingTranscript(false);
      if (generateTimeoutRef.current) {
        clearTimeout(generateTimeoutRef.current);
        generateTimeoutRef.current = null;
      }
      if (generateAbortControllerRef.current === abortController) {
        generateAbortControllerRef.current = null;
      }
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
      onSettled?.();
    }
  };

  const subscribeToNoteCompletion = (userId, timestamp, capture) => {
    captureRef.current = Object.freeze({ ...capture, userId, timestamp });
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const timeoutId = transcriptFallbackTimeoutRef.current = setTimeout(() => {
      console.log(`Subscription wait timeout (${TRANSCRIPT_WAIT_TIMEOUT_MS / 1000} seconds) - moving on automatically`);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      setIsTranscriptCompleted(true);
      streamResponse({ fromTranscriptFallback: true });
    }, TRANSCRIPT_WAIT_TIMEOUT_MS);

    const observer = {
      next: ({ data }) => {
        if (isDiscardingRef.current) return;
        const updatedNote = data.onUpdateNotesByOwner;

        if (updatedNote.timestamp && updatedNote.timestamp.toString() === timestamp.toString()) {


          const transcriptError = parseLambdaErrorPayload(updatedNote.transcript || '');
          if (transcriptError) {
            console.warn('Transcript update contains backend error payload, moving on to note generation fallback path');
            clearTimeout(timeoutId);
            setIsTranscriptCompleted(true);
            if (subscriptionRef.current) {
              subscriptionRef.current.unsubscribe();
              subscriptionRef.current = null;
            }
            streamResponse({ fromTranscriptFallback: true });
            return;
          }

          if (updatedNote.isCompleted === true) {
            console.log('Transcript processing completed!');
            clearTimeout(timeoutId);
            setIsTranscriptCompleted(true);
            if (subscriptionRef.current) {
              subscriptionRef.current.unsubscribe();
              subscriptionRef.current = null;
            }
            streamResponse();
          }
        }
      },
      error: (error) => {
        if (isDiscardingRef.current) return;
        console.error('Subscription error:', error);
        clearTimeout(timeoutId);
        setIsTranscriptCompleted(true);
        streamResponse({ fromTranscriptFallback: true });
      }
    };
    try {
      subscriptionRef.current = client.graphql({
        query: subscriptions.onUpdateNotesByOwner,
        variables: { owner: userId }
      }).subscribe(observer);
    } catch (error) {
      // A synchronous subscription setup failure follows the existing error
      // fallback, without turning an acknowledged final into another dispatch.
      observer.error(error);
    }
  };

  return {
    subscribeToNoteCompletion,
    streamResponse,
    failNoteGeneration: handleNoteGenerationFailure,
    cleanupNoteGeneration
  };
}

// The transport and generation policy stay unchanged; each recording owns its
// subscription, preview, timers and abort controller. Presentation ownership is
// independent, so an older recording can finish without replacing a newer one.
const ref = current => ({ current });
function useNoteGeneration(options) {
  const sessions = useRef(new Map());
  const latest = useRef(options);
  latest.current = options;
  const subscribeToNoteCompletion = (userId, timestamp, capture) => {
    if (sessions.current.has(capture.generation)) return;
    const visible = () => latest.current.isCurrentCapture(capture);
    const scoped = {};
    for (const name of ['setTextStream', 'setIsPreparingTranscript', 'setIsGeneratingSummary',
      'setIsTranscriptCompleted', 'onTextStreamUpdate', 'onTransitionToMainApp',
      'onGenerationStateChange']) {
      scoped[name] = (...args) => { if (visible()) latest.current[name]?.(...args); };
    }
    scoped.onGenerationError = error => {
      if (visible()) latest.current.onGenerationError?.(error);
      else if (error) latest.current.onBackgroundGenerationError?.("An earlier recording's note could not finish. Check History.");
    };
    const session = createNoteGeneration({
      ...scoped,
      isDiscardingRef: ref(false),
      noSleepRef: { current: { disable: () => latest.current.releaseNoSleep(capture) } },
      onSavedNoteReady: note => latest.current.onSavedNoteReady?.(note, { isCurrent: visible() }),
      onSettled: () => {
        session.cleanupNoteGeneration();
        // Keep only a small completion marker to reject duplicate finals.
        sessions.current.set(capture.generation, null);
      },
    });
    sessions.current.set(capture.generation, session);
    session.subscribeToNoteCompletion(userId, timestamp, capture);
  };
  const cleanupNoteGeneration = generation => {
    for (const [key, session] of sessions.current) {
      if (generation === undefined || generation === key) {
        session?.cleanupNoteGeneration();
        sessions.current.delete(key);
      }
    }
  };
  return { subscribeToNoteCompletion, cleanupNoteGeneration };
}

export default useNoteGeneration;
