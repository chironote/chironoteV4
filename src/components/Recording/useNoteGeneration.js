import { useRef } from 'react';
import { generateClient } from 'aws-amplify/api';
import * as subscriptions from '../../graphql/subscriptions';
import {
  NOTE_GENERATION_RETRY_MESSAGE,
  NOTE_GENERATION_STREAM_ERROR_SENTINEL,
  NOTE_GENERATION_TIMEOUT_AFTER_TRANSCRIPT_FALLBACK_MS,
  NOTE_GENERATION_TIMEOUT_MS,
  NOTE_GENERATION_URL,
  TRANSCRIPT_WAIT_TIMEOUT_MS
} from './recordingConstants';
import { generateToken, getUserId } from './recordingAuth';
import { parseLambdaErrorPayload } from './noteGenerationErrors';
import { patientNotesEnabled, patientRequest } from '../../services/patientNotes';

const client = generateClient();

function useNoteGeneration({
  onGenerationStateChange,
  onGenerationError,
  onSavedNoteReady,
  captureRef,
  timeStampRef,
  isDiscardingRef,
  noSleepRef,
  setTextStream,
  setIsPreparingTranscript,
  setIsGeneratingSummary,
  setIsTranscriptCompleted,
  onTextStreamUpdate,
  onTransitionToMainApp
}) {
  const runRef = useRef(0);
  const previewRef = useRef('');
  const subscriptionRef = useRef(null);
  const generateTimeoutRef = useRef(null);
  const transcriptFallbackTimeoutRef = useRef(null);
  const hasStartedStreamingRef = useRef(false);
  const hasHandledNoteGenerationFailureRef = useRef(false);
  const generateAbortControllerRef = useRef(null);

  const resetNoteGenerationState = () => {
    hasStartedStreamingRef.current = false;
    hasHandledNoteGenerationFailureRef.current = false;
  };

  const cleanupNoteGeneration = () => {
    runRef.current++;
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
    onGenerationError?.(previewRef.current ? `This preview was not saved. ${message}` : message);
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
    const timestamp = timeStampRef.current;
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
      const userId = capture?.userId || await getUserId();
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
      let streamControlBuffer = '';

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
        if (chunk.done) {
          if (patientNotesEnabled && !hasHandledNoteGenerationFailureRef.current && !isDiscardingRef.current) {
            const saved = await patientRequest('getSavedNote', { timestamp: String(timestamp) });
            if (!active()) return;
            if (!saved.note.ready) throw new Error('The complete note has not been saved.');
            setTextStream(saved.note.note); onTextStreamUpdate(saved.note.note); onSavedNoteReady?.(saved.note);
          }
          if (generateTimeoutRef.current) {
            clearTimeout(generateTimeoutRef.current);
            generateTimeoutRef.current = null;
          }
          break;
        }

        const text = decoder.decode(chunk.value, { stream: !chunk.done });
        const chunkForErrorDetection = streamControlBuffer + text;
        const lambdaChunkError = parseLambdaErrorPayload(chunkForErrorDetection);
        if (lambdaChunkError) {
          handleNoteGenerationFailure('lambda_stream_chunk_error', lambdaChunkError);
          try {
            await reader.cancel();
          } catch (cancelError) {
            console.warn('Error cancelling note generation stream reader after chunk error:', cancelError);
          }
          break;
        }

        const sentinelTailLength = NOTE_GENERATION_STREAM_ERROR_SENTINEL.length - 1;
        streamControlBuffer = chunkForErrorDetection.slice(-sentinelTailLength);

        if (hasHandledNoteGenerationFailureRef.current || isDiscardingRef.current) {
          break;
        }

        previewRef.current = (previewRef.current + text).split('\u0000')[0];
        setTextStream(previewRef.current);
        onTextStreamUpdate(previewRef.current);
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
    }
  };

  const subscribeToNoteCompletion = async (userId, timestamp) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const timeoutId = setTimeout(() => {
      console.log(`Subscription wait timeout (${TRANSCRIPT_WAIT_TIMEOUT_MS / 1000} seconds) - moving on automatically`);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      setIsTranscriptCompleted(true);
      streamResponse({ fromTranscriptFallback: true });
    }, TRANSCRIPT_WAIT_TIMEOUT_MS);

    subscriptionRef.current = client.graphql({
      query: subscriptions.onUpdateNotesByOwner,
      variables: { owner: userId }
    }).subscribe({
      next: ({ data }) => {

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
        console.error('Subscription error:', error);
        clearTimeout(timeoutId);
        setIsTranscriptCompleted(true);
        streamResponse({ fromTranscriptFallback: true });
      }
    });
  };

  return {
    subscribeToNoteCompletion,
    streamResponse,
    failNoteGeneration: handleNoteGenerationFailure,
    resetNoteGenerationState,
    cleanupNoteGeneration
  };
}

export default useNoteGeneration;
