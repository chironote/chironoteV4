import React, { useCallback, useEffect, useRef, useState } from 'react';
import ProductDialog from '../Dialog/ProductDialog';
import {
  CUSTOM_INSTRUCTIONS_MAX_LENGTH,
  createCustomInstructionsRequestId,
  startCustomInstructionsCompilation
} from '../../services/customInstructions';

export const CUSTOM_INSTRUCTIONS_LEAVE_DELAY_MS = 30000;

const progressStages = [
  'Reading how you prefer to document…',
  'Adapting your exam and follow-up sections…',
  'Checking all ten SOATP instructions…'
];

const compilationErrorMessage = (settings) => (
  settings.effectiveMode === 'CUSTOM'
    ? "ChiroNote couldn't apply this update. Your previous custom instructions are still active. Review your text and try again."
    : "ChiroNote couldn't compile these instructions. ChiroNote defaults remain active. Review your text and try again."
);

function CustomInstructionsDialog({
  isOpen,
  settings,
  pollNotice,
  statusError,
  onClose,
  onCompilationAccepted,
  onCompilationRequestFailed,
  returnFocusRef
}) {
  const [instructions, setInstructions] = useState('');
  const [initialInstructions, setInitialInstructions] = useState('');
  const [phase, setPhase] = useState('editing');
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [canLeave, setCanLeave] = useState(true);
  const [currentJobId, setCurrentJobId] = useState(null);
  const textareaRef = useRef(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const retryRequestRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const value = settings.instructions || '';
      const compilationInProgress = settings.compileStatus === 'COMPILING';
      setIsUpdateMode(settings.hasSavedInstructions || Boolean(settings.activeCompiledAt));
      setInstructions(value);
      setInitialInstructions(value);
      setPhase(compilationInProgress ? 'compiling' : 'editing');
      setError(settings.compileStatus === 'FAILED' ? compilationErrorMessage(settings) : '');
      setErrorType(settings.compileStatus === 'FAILED' ? 'form' : null);
      setStageIndex(0);
      setCanLeave(compilationInProgress);
      setCurrentJobId(settings.compileJobId || null);
      submittingRef.current = compilationInProgress;
      retryRequestRef.current = null;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen
      || phase !== 'editing'
      || settings.compileStatus !== 'COMPILING'
      || !settings.compileJobId) {
      return;
    }

    const value = settings.instructions || instructions;
    setInstructions(value);
    setInitialInstructions(value);
    setIsUpdateMode(settings.hasSavedInstructions || Boolean(settings.activeCompiledAt));
    setCurrentJobId(settings.compileJobId);
    setStageIndex(0);
    setCanLeave(true);
    setError('');
    setErrorType(null);
    setPhase('compiling');
    submittingRef.current = true;
    retryRequestRef.current = null;
  }, [instructions, isOpen, phase, settings]);

  useEffect(() => {
    if (phase !== 'submitting' && phase !== 'compiling') return undefined;
    const timer = window.setInterval(() => {
      setStageIndex((value) => Math.min(value + 1, progressStages.length - 1));
    }, 10000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'compiling' || canLeave) return undefined;
    const timer = window.setTimeout(() => setCanLeave(true), CUSTOM_INSTRUCTIONS_LEAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [canLeave, phase]);

  useEffect(() => {
    if (!isOpen || phase !== 'compiling') return;

    const serverJobId = settings.compileJobId || null;
    if (settings.compileStatus === 'COMPILING') {
      if (serverJobId && serverJobId !== currentJobId) {
        setCurrentJobId(serverJobId);
        setInstructions(settings.instructions || '');
        setInitialInstructions(settings.instructions || '');
        setCanLeave(true);
      }
      return;
    }

    if (!serverJobId) return;
    if (serverJobId !== currentJobId) {
      setCurrentJobId(serverJobId);
      setCanLeave(true);
    }

    submittingRef.current = false;
    if (settings.compileStatus === 'READY') {
      setInstructions(settings.instructions || instructions);
      setInitialInstructions(settings.instructions || instructions);
      setPhase(settings.effectiveMode === 'CUSTOM' ? 'success' : 'completed-defaults');
      return;
    }

    if (settings.compileStatus === 'FAILED') {
      const savedValue = settings.instructions || instructions;
      setInstructions(savedValue);
      setInitialInstructions(savedValue);
      setIsUpdateMode(settings.hasSavedInstructions || Boolean(settings.activeCompiledAt));
      setError(compilationErrorMessage(settings));
      setErrorType('form');
      setCanLeave(true);
      setPhase('editing');
    }
  }, [currentJobId, instructions, isOpen, phase, settings]);

  const isDirty = instructions !== initialInstructions;

  const requestClose = useCallback(() => {
    if (phase === 'submitting' || (phase === 'compiling' && !canLeave)) return;
    if (phase === 'editing' && isDirty && !window.confirm('Discard your unsaved custom instructions?')) return;
    onClose();
  }, [canLeave, isDirty, onClose, phase]);

  const validationError = !instructions.trim()
    ? 'Enter your note-style preferences before compiling.'
    : instructions.length > CUSTOM_INSTRUCTIONS_MAX_LENGTH
      ? `Keep instructions within ${CUSTOM_INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters.`
      : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (validationError) {
      setError(validationError);
      setErrorType('field');
      textareaRef.current?.focus();
      return;
    }

    const normalizedInstructions = instructions.trim();
    const retryRequest = retryRequestRef.current;
    const clientRequestId = retryRequest?.instructions === normalizedInstructions
      ? retryRequest.clientRequestId
      : createCustomInstructionsRequestId();
    retryRequestRef.current = { instructions: normalizedInstructions, clientRequestId };
    submittingRef.current = true;
    setError('');
    setErrorType(null);
    setStageIndex(0);
    setCanLeave(false);
    setPhase('submitting');

    try {
      const accepted = await startCustomInstructionsCompilation(normalizedInstructions, clientRequestId);
      if (!mountedRef.current) return;
      setInstructions(normalizedInstructions);
      setInitialInstructions(normalizedInstructions);
      setCurrentJobId(accepted.jobId);
      setPhase('compiling');
      retryRequestRef.current = null;
      onCompilationAccepted(accepted, normalizedInstructions);
    } catch (requestError) {
      if (!mountedRef.current) return;
      setError(requestError.message);
      setErrorType('form');
      setCanLeave(true);
      setPhase('editing');
      submittingRef.current = false;
      onCompilationRequestFailed();
    }
  };

  const isProcessing = phase === 'submitting' || phase === 'compiling';
  const title = isProcessing
    ? 'Compiling your instructions'
    : phase === 'success'
      ? 'Custom instructions ready'
      : phase === 'completed-defaults'
        ? 'Instructions saved'
        : isUpdateMode
          ? 'Update custom instructions'
          : 'Create custom instructions';

  return (
    <ProductDialog
      isOpen={isOpen}
      title={title}
      description={isProcessing
        ? 'ChiroNote is learning how you prefer exam and follow-up notes to be written.'
        : 'Describe your preferred note style in natural language. ChiroNote will apply it to new notes.'}
      onRequestClose={requestClose}
      initialFocusRef={phase === 'editing' ? textareaRef : undefined}
      returnFocusRef={returnFocusRef}
      dismissalDisabled={phase === 'submitting' || (phase === 'compiling' && !canLeave)}
    >
      {isProcessing && (
        <div className="custom-progress">
          <span className="settings-spinner" aria-hidden="true" />
          <p role="status" aria-live="polite">{phase === 'submitting' ? 'Starting securely…' : progressStages[stageIndex]}</p>
          <span>These are approximate activity updates. Readiness is always confirmed by the server.</span>
          <p className="custom-progress__active-mode">
            {settings.effectiveMode === 'CUSTOM'
              ? 'Your current custom instructions remain active while this update is checked.'
              : 'ChiroNote defaults remain active until the complete instruction set is ready.'}
          </p>
          {canLeave && (
            <div className="custom-progress__leave">
              <strong>This can take a few minutes.</strong>
              <span>You can leave Settings; ChiroNote will keep working.</span>
              <button type="button" className="settings-button settings-button--secondary" onClick={requestClose}>Close and continue later</button>
            </div>
          )}
          {pollNotice && <div className="settings-message settings-message--info" role="status">{pollNotice}</div>}
          {statusError && <div className="settings-message settings-message--error" role="alert">{statusError} You can close this dialog and return later.</div>}
        </div>
      )}

      {phase === 'success' && (
        <div className="custom-success">
          <span className="material-symbols-rounded" aria-hidden="true">check_circle</span>
          <strong role="status" aria-live="polite">{isUpdateMode ? 'Custom instructions updated' : 'Custom instructions enabled'}</strong>
          <span>Server-confirmed and ready for new notes across your account.</span>
          <button type="button" className="settings-button settings-button--primary" onClick={requestClose}>Close</button>
        </div>
      )}

      {phase === 'completed-defaults' && (
        <div className="custom-success">
          <span className="material-symbols-rounded" aria-hidden="true">task_alt</span>
          <strong role="status" aria-live="polite">Instructions saved; defaults are active</strong>
          <span>Your saved wording was not deleted. You can enable it again from Settings.</span>
          <button type="button" className="settings-button settings-button--secondary" onClick={requestClose}>Close</button>
        </div>
      )}

      {phase === 'editing' && (
        <form className="custom-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="custom-instructions">Your note-style preferences</label>
          <p id="custom-instructions-help">Describe preferred tone, detail, phrasing, formatting, or section behavior. Do not include patient information.</p>
          <textarea
            ref={textareaRef}
            id="custom-instructions"
            value={instructions}
            onChange={(event) => { setInstructions(event.target.value); setError(''); setErrorType(null); }}
            maxLength={CUSTOM_INSTRUCTIONS_MAX_LENGTH}
            aria-invalid={errorType === 'field'}
            aria-describedby={`custom-instructions-help${errorType === 'field' ? ' custom-instructions-error' : ''}`}
          />
          <div className="custom-form__meta">
            <span>{instructions.length.toLocaleString()} / {CUSTOM_INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters</span>
          </div>
          {error && <div id="custom-instructions-error" className="settings-message settings-message--error" role="alert">{error}</div>}
          <div className="custom-form__actions">
            <button type="button" className="settings-button settings-button--secondary" onClick={requestClose}>Cancel</button>
            <button type="submit" className="settings-button settings-button--primary">{isUpdateMode ? 'Compile update' : 'Compile instructions'}</button>
          </div>
        </form>
      )}
    </ProductDialog>
  );
}

export default CustomInstructionsDialog;
