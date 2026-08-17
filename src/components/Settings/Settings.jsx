import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { getUserSubscription } from '../../graphql/queries';
import { getAmplifyClient } from '../../services/amplifyClient';
import {
  CUSTOM_INSTRUCTIONS_FAST_POLL_INTERVAL_MS,
  CUSTOM_INSTRUCTIONS_FAST_POLL_WINDOW_MS,
  CUSTOM_INSTRUCTIONS_POLL_CEILING_MS,
  CUSTOM_INSTRUCTIONS_SLOW_POLL_INTERVAL_MS,
  disableCustomInstructions,
  isCustomInstructionsAvailable,
  loadCustomInstructions
} from '../../services/customInstructions';
import CustomInstructionsDialog from './CustomInstructionsDialog';
import './Settings.css';

const hoursFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const emptyCustomSettings = {
  enableCustomInstructions: false,
  effectiveMode: 'DEFAULT',
  compileStatus: 'NEVER',
  instructions: null,
  compileJobId: null,
  hasSavedInstructions: false,
  updatedAt: null,
  activeCompiledAt: null,
  lastErrorCode: null
};

const resolveCustomStatus = (settings) => {
  if (settings.compileStatus === 'COMPILING') {
    if (!settings.enableCustomInstructions && settings.effectiveMode === 'DEFAULT') return 'compiling-disabled';
    return settings.effectiveMode === 'CUSTOM' ? 'updating' : 'compiling';
  }
  if (settings.compileStatus === 'FAILED') {
    return settings.effectiveMode === 'CUSTOM' ? 'failed-active' : 'failed-default';
  }
  if (settings.effectiveMode === 'CUSTOM') return 'enabled';
  if (settings.hasSavedInstructions) return 'disabled';
  return 'never';
};

const customPresentations = {
  loading: ['hourglass_top', 'Loading', 'Loading your saved instructions before actions are enabled.'],
  never: ['edit_note', 'Not set up', "ChiroNote's default note style is active. Add one description to personalize future notes."],
  disabled: ['toggle_off', 'Using defaults', 'Your saved wording is available to edit, but ChiroNote defaults are active.'],
  compiling: ['progress_activity', 'Compiling', 'ChiroNote defaults remain active until all ten instructions are ready. You can leave Settings safely.'],
  'compiling-disabled': ['toggle_off', 'Using defaults', 'Compilation can finish in the background, but it will not re-enable your saved instructions.'],
  updating: ['progress_activity', 'Updating', 'Your previous custom instructions remain active while the update is checked.'],
  enabled: ['check_circle', 'Enabled', 'Server-confirmed custom instructions apply to new notes across your account.'],
  'failed-active': ['error', 'Update needs attention', 'The update failed safely. Your previous custom instructions are still active.'],
  'failed-default': ['error', 'Needs attention', 'The compilation failed safely. ChiroNote defaults remain active.'],
  error: ['error', 'Status unavailable', 'The saved state is unknown. Retry before making changes.'],
  unavailable: ['cloud_off', 'Unavailable', 'Custom instructions are hidden for this environment.']
};

const dialogActionLabels = {
  never: 'Create',
  disabled: 'Edit and enable',
  compiling: 'View progress',
  'compiling-disabled': 'View progress',
  updating: 'View progress',
  enabled: 'Update',
  'failed-active': 'Review and retry',
  'failed-default': 'Review and retry'
};

function Settings() {
  const [hoursStatus, setHoursStatus] = useState('loading');
  const [hoursSavedLifetime, setHoursSavedLifetime] = useState(0);
  const available = isCustomInstructionsAvailable();
  const [customLoadStatus, setCustomLoadStatus] = useState(available ? 'loading' : 'unavailable');
  const [customSettings, setCustomSettings] = useState(emptyCustomSettings);
  const [customError, setCustomError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [pollPausedJobId, setPollPausedJobId] = useState(null);
  const [pollNotice, setPollNotice] = useState('');
  const mountedRef = useRef(true);
  const loadRequestCounterRef = useRef(0);
  const latestAppliedLoadRef = useRef(0);
  const customActionRef = useRef(null);

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

  const invalidatePendingCustomLoads = useCallback(() => {
    const boundary = ++loadRequestCounterRef.current;
    latestAppliedLoadRef.current = boundary;
  }, []);

  const loadCustom = useCallback(async ({ showLoading = false } = {}) => {
    if (!available) return null;
    const requestId = ++loadRequestCounterRef.current;
    if (showLoading) {
      setCustomLoadStatus('loading');
      setCustomError('');
    }

    try {
      const result = await loadCustomInstructions();
      if (!mountedRef.current || requestId < latestAppliedLoadRef.current) return null;
      latestAppliedLoadRef.current = requestId;
      setCustomSettings(result);
      setCustomLoadStatus('ready');
      setCustomError('');
      if (result.compileStatus !== 'COMPILING') {
        setPollPausedJobId(null);
        setPollNotice('');
      }
      return result;
    } catch (error) {
      if (!mountedRef.current || requestId < latestAppliedLoadRef.current) return null;
      latestAppliedLoadRef.current = requestId;
      setCustomError(error.message);
      if (showLoading) setCustomLoadStatus('error');
      return null;
    }
  }, [available]);

  useEffect(() => {
    loadHours();
    if (available) loadCustom({ showLoading: true });
  }, [available, loadCustom, loadHours]);

  useEffect(() => {
    if (!available) return undefined;
    const handleFocus = () => {
      setPollPausedJobId(null);
      setPollNotice('');
      loadCustom();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [available, loadCustom]);

  useEffect(() => {
    const jobId = customSettings.compileJobId;
    if (customLoadStatus !== 'ready'
      || customSettings.compileStatus !== 'COMPILING'
      || !jobId
      || pollPausedJobId === jobId) {
      return undefined;
    }

    let cancelled = false;
    let timerId;
    const startedAt = Date.now();

    const scheduleNext = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= CUSTOM_INSTRUCTIONS_POLL_CEILING_MS) {
        setPollPausedJobId(jobId);
        setPollNotice('Still working. You can return later; ChiroNote will reload the real server status when Settings regains focus.');
        return;
      }
      const delay = elapsed < CUSTOM_INSTRUCTIONS_FAST_POLL_WINDOW_MS
        ? CUSTOM_INSTRUCTIONS_FAST_POLL_INTERVAL_MS
        : CUSTOM_INSTRUCTIONS_SLOW_POLL_INTERVAL_MS;
      timerId = window.setTimeout(poll, delay);
    };

    const poll = async () => {
      const result = await loadCustom();
      if (cancelled) return;
      if (result && (result.compileStatus !== 'COMPILING' || result.compileJobId !== jobId)) return;
      scheduleNext();
    };

    scheduleNext();
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    customLoadStatus,
    customSettings.compileJobId,
    customSettings.compileStatus,
    loadCustom,
    pollPausedJobId
  ]);

  const handleCompilationAccepted = useCallback((accepted, instructions) => {
    invalidatePendingCustomLoads();
    setCustomSettings((current) => ({
      ...current,
      enableCustomInstructions: true,
      effectiveMode: accepted.effectiveMode,
      compileStatus: 'COMPILING',
      compileJobId: accepted.jobId,
      instructions,
      hasSavedInstructions: true,
      lastErrorCode: null
    }));
    setCustomLoadStatus('ready');
    setCustomError('');
    setPollPausedJobId(null);
    setPollNotice('');
  }, [invalidatePendingCustomLoads]);

  const openCustomDialog = useCallback(() => {
    setPollPausedJobId(null);
    setPollNotice('');
    setIsDialogOpen(true);
    if (customSettings.compileStatus === 'COMPILING') loadCustom();
  }, [customSettings.compileStatus, loadCustom]);

  const closeCustomDialog = useCallback(() => setIsDialogOpen(false), []);

  const handleDisable = async () => {
    if (!window.confirm('Use ChiroNote defaults for new notes? Your saved wording will be kept.')) return;
    invalidatePendingCustomLoads();
    setIsDisabling(true);
    setCustomError('');
    try {
      const result = await disableCustomInstructions();
      if (!mountedRef.current) return;
      invalidatePendingCustomLoads();
      setCustomSettings(result);
      setCustomLoadStatus('ready');
      setPollPausedJobId(null);
      setPollNotice('');
      setIsDialogOpen(false);
    } catch (error) {
      if (mountedRef.current) setCustomError(error.message);
    } finally {
      if (mountedRef.current) setIsDisabling(false);
    }
  };

  const customStatus = customLoadStatus === 'ready'
    ? resolveCustomStatus(customSettings)
    : customLoadStatus;
  const customCopy = customPresentations[customStatus];
  const dialogActionLabel = dialogActionLabels[customStatus];
  const canDisable = customLoadStatus === 'ready'
    && (customSettings.enableCustomInstructions || customSettings.effectiveMode === 'CUSTOM');

  return (
    <main className="settings-page">
      <div className="settings-page__heading"><h1>Settings</h1><p>Manage your note preferences and view your lifetime impact.</p></div>

      <section className="settings-card settings-metric-card" aria-labelledby="hours-saved-title">
        <div><h2 id="hours-saved-title">Lifetime hours saved</h2><p>Estimated time ChiroNote has saved across your account.</p></div>
        {hoursStatus === 'loading' && <p className="settings-loading" role="status"><span className="settings-spinner" aria-hidden="true" />Loading lifetime total…</p>}
        {hoursStatus === 'ready' && <p className="settings-lifetime-value">{hoursFormatter.format(hoursSavedLifetime)} <span>hours</span></p>}
        {hoursStatus === 'error' && <div className="settings-message settings-message--error" role="alert">Lifetime hours are unavailable. <button type="button" onClick={loadHours}>Retry</button></div>}
      </section>

      <section className="settings-card" aria-labelledby="custom-title" aria-busy={customStatus === 'loading' || isDisabling}>
        <div className="settings-card__header">
          <div><h2 id="custom-title">Custom instructions</h2><p>Tell ChiroNote how you prefer new clinical notes to be written.</p></div>
          <span className={`settings-badge settings-badge--${customStatus}`} role="status" aria-live="polite"><span className="material-symbols-rounded" aria-hidden="true">{customCopy[0]}</span>{customCopy[1]}</span>
        </div>
        <p className="settings-card__description">{customCopy[2]}</p>
        {customStatus === 'loading' && <p className="settings-loading" role="status"><span className="settings-spinner" aria-hidden="true" />Loading existing settings…</p>}
        {customError && <div className="settings-message settings-message--error" role="alert">{customError}</div>}
        {pollNotice && !isDialogOpen && <div className="settings-message settings-message--info" role="status">{pollNotice}</div>}
        <div className="settings-actions">
          {customStatus === 'error' && <button type="button" className="settings-button settings-button--secondary" onClick={() => loadCustom({ showLoading: true })}>Retry</button>}
          {dialogActionLabel && <button ref={customActionRef} type="button" className="settings-button settings-button--primary" onClick={openCustomDialog}>{dialogActionLabel}</button>}
          {canDisable && (
            <button type="button" className="settings-button settings-button--secondary" onClick={handleDisable} disabled={isDisabling}>{isDisabling ? 'Using defaults…' : 'Use defaults'}</button>
          )}
        </div>
      </section>

      <CustomInstructionsDialog
        isOpen={isDialogOpen}
        settings={customSettings}
        pollNotice={pollNotice}
        statusError={customError}
        onClose={closeCustomDialog}
        onCompilationAccepted={handleCompilationAccepted}
        onCompilationRequestFailed={loadCustom}
        returnFocusRef={customActionRef}
      />
    </main>
  );
}

export default Settings;
