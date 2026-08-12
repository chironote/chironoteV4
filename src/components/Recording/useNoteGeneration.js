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
import {
  addRecordingSupportReference,
  toSafeErrorCode
} from './recordingTelemetrySchema';
import {
  ON_UPDATE_NOTES_BY_OWNER_WITH_RECORDING_STATUS,
  createNoteGenerationRequest,
  getRecordingUpdateMatch,
  isRecordingStatusSchemaCompatibilityError
} from './recordingBackendContract';

const client = generateClient();
const SAFE_EXTERNAL_ID_PATTERN = /^[a-z0-9][a-z0-9._:/=+-]{0,255}$/i;

const getSafeExternalId = (value) => (
  typeof value === 'string' && SAFE_EXTERNAL_ID_PATTERN.test(value)
    ? value
    : undefined
);

function useNoteGeneration({
  timeStampRef,
  recordingJobIdRef = { current: null },
  isDiscardingRef,
  terminalOutcomeRef = { current: null },
  noSleepRef,
  emitTelemetry = () => {},
  telemetryContext = {},
  setTextStream,
  setIsPreparingTranscript,
  setIsGeneratingSummary,
  setIsTranscriptCompleted,
  onTextStreamUpdate,
  onTransitionToMainApp
}) {
  const subscriptionRef = useRef(null);
  const generateTimeoutRef = useRef(null);
  const transcriptFallbackTimeoutRef = useRef(null);
  const hasStartedStreamingRef = useRef(false);
  const hasHandledNoteGenerationFailureRef = useRef(false);
  const generateAbortControllerRef = useRef(null);
  const noteGenerationStartedAtRef = useRef(null);

  const emitTerminalOutcome = (eventName, payload = {}) => {
    if (terminalOutcomeRef.current) {
      return;
    }
    terminalOutcomeRef.current = eventName;
    emitTelemetry(eventName, payload);
  };

  const resetNoteGenerationState = () => {
    hasStartedStreamingRef.current = false;
    hasHandledNoteGenerationFailureRef.current = false;
    noteGenerationStartedAtRef.current = null;
  };

  const cleanupNoteGeneration = () => {
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
    console.error(`Note generation failed: ${reason} (${toSafeErrorCode(error, reason)})`);
    const isNoteGenerationFailure = reason !== 'audio_submission_failed';
    const errorCode = toSafeErrorCode(error, reason);
    if (isNoteGenerationFailure) {
      emitTelemetry('note_generation.failed', {
        attempt: 1,
        durationMs: Math.max(0, Date.now() - (noteGenerationStartedAtRef.current || Date.now())),
        errorCode,
        provider: 'lambda',
        reasonCode: reason
      });
    }
    emitTerminalOutcome('recording.failed', {
      errorCode,
      outcome: 'failed',
      reasonCode: reason
    });
    if (generateAbortControllerRef.current) {
      generateAbortControllerRef.current.abort();
      generateAbortControllerRef.current = null;
    }
    const messageWithReference = addRecordingSupportReference(
      userMessage,
      recordingJobIdRef.current
    );
    setTextStream(messageWithReference);
    onTextStreamUpdate(messageWithReference);
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
    hasHandledNoteGenerationFailureRef.current = false;
    if (transcriptFallbackTimeoutRef.current) {
      clearTimeout(transcriptFallbackTimeoutRef.current);
      transcriptFallbackTimeoutRef.current = null;
    }

    setIsGeneratingSummary(true);
    setIsPreparingTranscript(false);
    onTextStreamUpdate('');
    noteGenerationStartedAtRef.current = Date.now();
    emitTelemetry('note_generation.started', {
      attempt: 1,
      provider: 'lambda',
      transcriptFallback: fromTranscriptFallback
    });

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
      handleNoteGenerationFailure('timeout');
    }, generationTimeoutMs);

    try {
      const userId = await getUserId();
      if (!userId) {
        handleNoteGenerationFailure('user_not_authenticated');
        return;
      }
      const accessToken = await generateToken();

      const response = await fetch(NOTE_GENERATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createNoteGenerationRequest({
          accessToken,
          noteSettings: localStorage.getItem('noteSettings'),
          recordingJobId: recordingJobIdRef.current,
          telemetryContext,
          timeStamp: timeStampRef.current,
          userId
        })),
        signal: abortController.signal
      });

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
      const awsRequestId = response.headers.get('x-amzn-requestid') ||
        response.headers.get('x-amz-request-id') ||
        response.headers.get('x-request-id') ||
        undefined;

      setIsGeneratingSummary(false);
      onTransitionToMainApp();

      while (true) {
        if (hasHandledNoteGenerationFailureRef.current || isDiscardingRef.current) {
          try {
            await reader.cancel();
          } catch (cancelError) {
            console.warn(`Unable to cancel note generation stream (${toSafeErrorCode(cancelError, 'cancel_failed')})`);
          }
          break;
        }

        const chunk = await reader.read();
        if (chunk.done) {
          if (generateTimeoutRef.current) {
            clearTimeout(generateTimeoutRef.current);
            generateTimeoutRef.current = null;
          }
          if (!hasHandledNoteGenerationFailureRef.current && !isDiscardingRef.current) {
            emitTelemetry('note_generation.succeeded', {
              attempt: 1,
              awsRequestId,
              durationMs: Math.max(0, Date.now() - noteGenerationStartedAtRef.current),
              provider: 'lambda',
              transcriptFallback: fromTranscriptFallback
            });
            emitTerminalOutcome('recording.completed', {
              outcome: 'completed'
            });
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
            console.warn(`Unable to cancel failed note stream (${toSafeErrorCode(cancelError, 'cancel_failed')})`);
          }
          break;
        }

        const sentinelTailLength = NOTE_GENERATION_STREAM_ERROR_SENTINEL.length - 1;
        streamControlBuffer = chunkForErrorDetection.slice(-sentinelTailLength);

        if (hasHandledNoteGenerationFailureRef.current || isDiscardingRef.current) {
          break;
        }

        setTextStream((prev) => {
          const newText = prev + text;
          onTextStreamUpdate(newText);
          return newText;
        });
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        handleNoteGenerationFailure('streaming_exception', error);
      }
    } finally {
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

  const subscribeToNoteCompletion = async (
    userId,
    timestamp,
    recordingJobId = recordingJobIdRef.current
  ) => {
    const isCurrentRecording = () => (
      !isDiscardingRef.current &&
      recordingJobIdRef.current === recordingJobId
    );
    if (!isCurrentRecording()) {
      return;
    }
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    if (transcriptFallbackTimeoutRef.current) {
      clearTimeout(transcriptFallbackTimeoutRef.current);
      transcriptFallbackTimeoutRef.current = null;
    }

    const transcriptWaitStartedAt = Date.now();
    emitTelemetry('transcription.wait_started', {
      attempt: 1,
      provider: 'appsync'
    }, recordingJobId);

    const clearTranscriptWaitTimeout = () => {
      if (transcriptFallbackTimeoutRef.current) {
        clearTimeout(transcriptFallbackTimeoutRef.current);
        transcriptFallbackTimeoutRef.current = null;
      }
    };

    transcriptFallbackTimeoutRef.current = setTimeout(() => {
      transcriptFallbackTimeoutRef.current = null;
      if (!isCurrentRecording()) {
        return;
      }
      console.log(`Subscription wait timeout (${TRANSCRIPT_WAIT_TIMEOUT_MS / 1000} seconds) - moving on automatically`);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      emitTelemetry('transcription.failed', {
        attempt: 1,
        durationMs: Math.max(0, Date.now() - transcriptWaitStartedAt),
        errorCode: 'timeout',
        provider: 'appsync',
        reasonCode: 'transcript_wait_timeout'
      }, recordingJobId);
      setIsTranscriptCompleted(true);
      streamResponse({ fromTranscriptFallback: true });
    }, TRANSCRIPT_WAIT_TIMEOUT_MS);

    let isUsingLegacySubscription = false;

    const handleSubscriptionData = ({ data }) => {
      if (!isCurrentRecording()) {
        return;
      }
      const updatedNote = data?.onUpdateNotesByOwner;

      const transcriptMatchedBy = getRecordingUpdateMatch(updatedNote, {
        recordingJobId,
        timestamp
      });

      if (transcriptMatchedBy) {
        const transcriptionAttempt = Number.isInteger(updatedNote.transcriptionAttempt) &&
          updatedNote.transcriptionAttempt > 0
          ? updatedNote.transcriptionAttempt
          : 1;
        const transcriptionProvider = toSafeErrorCode(
          null,
          updatedNote.transcriptionProvider || 'transcription_backend'
        );
        const transcriptionRequestId = getSafeExternalId(updatedNote.transcriptionRequestId);

        const transcriptError = parseLambdaErrorPayload(updatedNote.transcript || '');
        if (transcriptError) {
          console.warn('Transcript update contains backend error payload, moving on to note generation fallback path');
          emitTelemetry('transcription.failed', {
            attempt: transcriptionAttempt,
            durationMs: Math.max(0, Date.now() - transcriptWaitStartedAt),
            errorCode: toSafeErrorCode(null, updatedNote.recordingErrorCode || 'backend_error_payload'),
            provider: transcriptionProvider,
            providerRequestId: transcriptionRequestId,
            transcriptMatchedBy
          }, recordingJobId);
          clearTranscriptWaitTimeout();
          setIsTranscriptCompleted(true);
          if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
          }
          streamResponse({ fromTranscriptFallback: true });
          return;
        }

        if (updatedNote.recordingStatus === 'transcription_failed') {
          emitTelemetry('transcription.failed', {
            attempt: transcriptionAttempt,
            durationMs: Math.max(0, Date.now() - transcriptWaitStartedAt),
            errorCode: toSafeErrorCode(null, updatedNote.recordingErrorCode || 'transcription_failed'),
            provider: transcriptionProvider,
            providerRequestId: transcriptionRequestId,
            transcriptMatchedBy
          }, recordingJobId);
          clearTranscriptWaitTimeout();
          setIsTranscriptCompleted(true);
          if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
          }
          streamResponse({ fromTranscriptFallback: true });
          return;
        }

        if (updatedNote.recordingStatus === 'no_speech') {
          emitTelemetry('transcription.no_speech', {
            attempt: transcriptionAttempt,
            durationMs: Math.max(0, Date.now() - transcriptWaitStartedAt),
            noSpeech: true,
            provider: transcriptionProvider,
            providerRequestId: transcriptionRequestId,
            transcriptMatchedBy
          }, recordingJobId);
          clearTranscriptWaitTimeout();
          setIsTranscriptCompleted(true);
          if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
          }
          streamResponse({ fromTranscriptFallback: true });
          return;
        }

        if (updatedNote.isCompleted === true) {
          emitTelemetry('transcription.completed', {
            attempt: transcriptionAttempt,
            durationMs: Math.max(0, Date.now() - transcriptWaitStartedAt),
            provider: transcriptionProvider,
            providerRequestId: transcriptionRequestId,
            transcriptMatchedBy
          }, recordingJobId);
          clearTranscriptWaitTimeout();
          setIsTranscriptCompleted(true);
          if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
          }
          streamResponse();
        }
      }
    };

    const handleSubscriptionError = (error) => {
      if (!isCurrentRecording()) {
        return;
      }
      if (
        !isUsingLegacySubscription &&
        isRecordingStatusSchemaCompatibilityError(error)
      ) {
        isUsingLegacySubscription = true;
        console.warn('Recording-status fields are unavailable; using legacy timestamp correlation');
        emitTelemetry('transcription.wait_started', {
          attempt: 2,
          provider: 'appsync',
          reasonCode: 'legacy_schema_fallback'
        }, recordingJobId);
        subscriptionRef.current = client.graphql({
          query: subscriptions.onUpdateNotesByOwner,
          variables: { owner: userId }
        }).subscribe({
          error: handleSubscriptionError,
          next: handleSubscriptionData
        });
        return;
      }

      console.error(`Recording subscription failed (${toSafeErrorCode(error, 'subscription_error')})`);
      clearTranscriptWaitTimeout();
      emitTelemetry('transcription.failed', {
        attempt: isUsingLegacySubscription ? 2 : 1,
        durationMs: Math.max(0, Date.now() - transcriptWaitStartedAt),
        errorCode: toSafeErrorCode(error, 'subscription_error'),
        provider: 'appsync',
        reasonCode: 'subscription_error'
      }, recordingJobId);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      setIsTranscriptCompleted(true);
      streamResponse({ fromTranscriptFallback: true });
    };

    subscriptionRef.current = client.graphql({
      query: ON_UPDATE_NOTES_BY_OWNER_WITH_RECORDING_STATUS,
      variables: { owner: userId }
    }).subscribe({
      error: handleSubscriptionError,
      next: handleSubscriptionData
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
