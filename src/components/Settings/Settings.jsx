import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { getUserSubscription } from '../../graphql/queries';
import { getAmplifyClient } from '../../services/amplifyClient';
import ProductDialog from '../Dialog/ProductDialog';
import {
  CUSTOM_INSTRUCTIONS_MAX_LENGTH,
  applyCustomInstructions,
  isCustomInstructionsAvailable,
  loadCustomInstructions,
  resetCustomInstructions
} from '../../services/customInstructions';
import './Settings.css';

const progressStages = [
  'Reviewing your preferences…',
  'Tailoring your SOATP sections…',
  'Finalizing examples and note style…'
];

const hoursFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function CustomInstructionsDialog({ isOpen, settings, onClose, onSaved }) {
  const [instructions, setInstructions] = useState('');
  const [initialInstructions, setInitialInstructions] = useState('');
  const [phase, setPhase] = useState('editing');
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [error, setError] = useState('');
  const [stageIndex, setStageIndex] = useState(0);
  const textareaRef = useRef(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const value = settings.enabled ? (settings.instructions || '') : '';
      setIsUpdateMode(settings.enabled);
      setInstructions(value);
      setInitialInstructions(value);
      setPhase('editing');
      setError('');
      setStageIndex(0);
      submittingRef.current = false;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, settings.enabled, settings.instructions]);

  useEffect(() => {
    if (phase !== 'saving') return undefined;
    const timer = window.setInterval(() => setStageIndex((value) => Math.min(value + 1, progressStages.length - 1)), 1800);
    return () => window.clearInterval(timer);
  }, [phase]);

  const isDirty = instructions !== initialInstructions;

  const requestClose = useCallback(() => {
    if (phase === 'saving') return;
    if (isDirty && !window.confirm('Discard your unsaved custom instructions?')) return;
    onClose();
  }, [isDirty, onClose, phase]);

  const validationError = !instructions.trim()
    ? 'Enter your note-style preferences before applying.'
    : instructions.length > CUSTOM_INSTRUCTIONS_MAX_LENGTH
      ? `Keep instructions within ${CUSTOM_INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters.`
      : '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (validationError) {
      setError(validationError);
      textareaRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setError('');
    setStageIndex(0);
    setPhase('saving');
    try {
      const result = await applyCustomInstructions(instructions);
      if (!mountedRef.current) return;
      setInstructions(result.instructions || instructions.trim());
      setInitialInstructions(result.instructions || instructions.trim());
      setPhase('success');
      onSaved(result);
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => {
        if (mountedRef.current) onClose();
      }, reduceMotion ? 80 : 850);
    } catch (requestError) {
      if (!mountedRef.current) return;
      setError(requestError.message);
      setPhase('editing');
      submittingRef.current = false;
    }
  };

  return (
    <ProductDialog
      isOpen={isOpen}
      title={isUpdateMode ? 'Update custom instructions' : 'Create custom instructions'}
      description="Describe your preferred note style in natural language. ChiroNote will apply it to new notes."
      onRequestClose={requestClose}
      initialFocusRef={textareaRef}
      dismissalDisabled={phase === 'saving'}
    >
      {phase === 'saving' && (
        <div className="custom-progress" role="status" aria-live="polite">
          <span className="settings-spinner" aria-hidden="true" />
          <p>{progressStages[stageIndex]}</p>
          <span>This is an approximate activity update while ChiroNote applies your preferences.</span>
        </div>
      )}

      {phase === 'success' && (
        <div className="custom-success" role="status" aria-live="polite">
          <span className="material-symbols-rounded" aria-hidden="true">check_circle</span>
          <strong>{isUpdateMode ? 'Custom instructions updated' : 'Custom instructions enabled'}</strong>
        </div>
      )}

      {phase === 'editing' && (
        <form className="custom-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="custom-instructions">Your note-style preferences</label>
          <p id="custom-instructions-help">For example, describe preferred tone, detail level, phrasing, or formatting. Do not include patient information.</p>
          <textarea
            ref={textareaRef}
            id="custom-instructions"
            value={instructions}
            onChange={(event) => { setInstructions(event.target.value); setError(''); }}
            maxLength={CUSTOM_INSTRUCTIONS_MAX_LENGTH}
            aria-invalid={Boolean(error)}
            aria-describedby={`custom-instructions-help${error ? ' custom-instructions-error' : ''}`}
          />
          <div className="custom-form__meta">
            <span>{instructions.length.toLocaleString()} / {CUSTOM_INSTRUCTIONS_MAX_LENGTH.toLocaleString()} characters</span>
          </div>
          {error && <div id="custom-instructions-error" className="settings-message settings-message--error" role="alert">{error}</div>}
          <div className="custom-form__actions">
            <button type="button" className="settings-button settings-button--secondary" onClick={requestClose}>Cancel</button>
            <button type="submit" className="settings-button settings-button--primary">Apply custom instructions</button>
          </div>
        </form>
      )}
    </ProductDialog>
  );
}

function Settings() {
  const [hoursStatus, setHoursStatus] = useState('loading');
  const [hoursSavedLifetime, setHoursSavedLifetime] = useState(0);
  const available = isCustomInstructionsAvailable();
  const [customStatus, setCustomStatus] = useState(available ? 'loading' : 'unavailable');
  const [customSettings, setCustomSettings] = useState({ enabled: false, instructions: null });
  const [customError, setCustomError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadHours = useCallback(async () => {
    setHoursStatus('loading');
    try {
      const attributes = await fetchUserAttributes();
      const result = await getAmplifyClient().graphql({ query: getUserSubscription, variables: { owner: attributes.sub } });
      if (!mountedRef.current) return;
      setHoursSavedLifetime(Number(result?.data?.getUserSubscription?.hoursSavedLifetime) || 0);
      setHoursStatus('ready');
    } catch (error) {
      if (mountedRef.current) setHoursStatus('error');
    }
  }, []);

  const loadCustom = useCallback(async () => {
    if (!available) return;
    setCustomStatus('loading');
    setCustomError('');
    try {
      const result = await loadCustomInstructions();
      if (!mountedRef.current) return;
      setCustomSettings(result);
      setCustomStatus(result.enabled ? 'enabled' : 'disabled');
    } catch (error) {
      if (!mountedRef.current) return;
      setCustomError(error.message);
      setCustomStatus('error');
    }
  }, [available]);

  useEffect(() => { loadHours(); loadCustom(); }, [loadCustom, loadHours]);

  const handleReset = async () => {
    if (!window.confirm('Use ChiroNote defaults for new notes? Your custom instructions will be disabled.')) return;
    setIsResetting(true);
    setCustomError('');
    try {
      const result = await resetCustomInstructions();
      if (!mountedRef.current) return;
      setCustomSettings(result);
      setCustomStatus(result.enabled ? 'enabled' : 'disabled');
    } catch (error) {
      if (mountedRef.current) setCustomError(error.message);
    } finally {
      if (mountedRef.current) setIsResetting(false);
    }
  };

  const customCopy = {
    loading: ['hourglass_top', 'Loading existing settings…', 'Actions will be available after your saved settings load.'],
    disabled: ['toggle_off', 'Disabled', "ChiroNote's default note style is being used."],
    enabled: ['check_circle', 'Enabled', 'Custom instructions apply to new notes.'],
    error: ['error', 'Settings could not be loaded', 'The current state is unknown. Retry before making changes.'],
    unavailable: ['cloud_off', 'Unavailable', 'Custom instructions are not configured for this environment.']
  }[customStatus];

  return (
    <main className="settings-page">
      <div className="settings-page__heading"><h1>Settings</h1><p>Manage your note preferences and view your lifetime impact.</p></div>

      <section className="settings-card settings-metric-card" aria-labelledby="hours-saved-title">
        <div><h2 id="hours-saved-title">Lifetime hours saved</h2><p>Estimated time ChiroNote has saved across your account.</p></div>
        {hoursStatus === 'loading' && <p className="settings-loading" role="status"><span className="settings-spinner" aria-hidden="true" />Loading lifetime total…</p>}
        {hoursStatus === 'ready' && <p className="settings-lifetime-value">{hoursFormatter.format(hoursSavedLifetime)} <span>hours</span></p>}
        {hoursStatus === 'error' && <div className="settings-message settings-message--error" role="alert">Lifetime hours are unavailable. <button type="button" onClick={loadHours}>Retry</button></div>}
      </section>

      <section className="settings-card" aria-labelledby="custom-title">
        <div className="settings-card__header">
          <div><h2 id="custom-title">Custom instructions</h2><p>Tell ChiroNote how you prefer new clinical notes to be written.</p></div>
          <span className={`settings-badge settings-badge--${customStatus}`}><span className="material-symbols-rounded" aria-hidden="true">{customCopy[0]}</span>{customCopy[1]}</span>
        </div>
        <p className="settings-card__description">{customCopy[2]}</p>
        {customStatus === 'loading' && <p className="settings-loading" role="status"><span className="settings-spinner" aria-hidden="true" />Loading existing settings…</p>}
        {(customStatus === 'error' || customError) && <div className="settings-message settings-message--error" role="alert">{customError || 'Custom instructions could not be loaded.'}</div>}
        <div className="settings-actions">
          {customStatus === 'error' && <button type="button" className="settings-button settings-button--secondary" onClick={loadCustom}>Retry</button>}
          {(customStatus === 'disabled' || customStatus === 'enabled') && (
            <button type="button" className="settings-button settings-button--primary" onClick={() => setIsDialogOpen(true)}>{customStatus === 'enabled' ? 'Update' : 'Create'}</button>
          )}
          {customStatus === 'enabled' && (
            <button type="button" className="settings-button settings-button--secondary" onClick={handleReset} disabled={isResetting}>{isResetting ? 'Using defaults…' : 'Use defaults'}</button>
          )}
        </div>
      </section>

      <CustomInstructionsDialog
        isOpen={isDialogOpen}
        settings={customSettings}
        onClose={() => setIsDialogOpen(false)}
        onSaved={(result) => { setCustomSettings(result); setCustomStatus(result.enabled ? 'enabled' : 'disabled'); }}
      />
    </main>
  );
}

export default Settings;
