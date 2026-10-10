import React, { useEffect, useRef, useState } from 'react';
import { patientRequest, retrySavedGeneration } from '../../services/patientNotes';
import PatientCapturePicker from './PatientCapturePicker';
import useDraftGuard from './useDraftGuard';
import './Patients.css';

export default function SavedNoteEditor({ timestamp, desktopSave = false, initialDraft, initialNote, onClose, onSaved }) {
  const [note, setNote] = useState(null); const [draft, setDraft] = useState(''); const [metadata, setMetadata] = useState(null);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [confirmation, setConfirmation] = useState(null);
  const [showMetadata, setShowMetadata] = useState(false); const [contextConfirmed, setContextConfirmed] = useState(false);
  const [patientName, setPatientName] = useState('Name Unknown');
  const requestRef = useRef(null); const headingRef = useRef(null);
  const dirty = note && draft !== note.note;
  useEffect(() => {
    let active = true; setNote(null); setMessage(''); setConfirmation(null); requestRef.current = null;
    patientRequest('getSavedNote', { timestamp }).then(result => {
      if (!active) return;
      const baseline = initialNote || result.note;
      setNote(baseline); setDraft(initialDraft ?? baseline.note ?? ''); setMetadata(baseline);
      if (initialNote && initialNote.version !== result.note.version) setMessage('The saved note changed after this draft was loaded. Your draft is preserved; reload before saving against a newer version.');
    }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [timestamp, initialDraft, initialNote]);
  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => {
    let active = true; setPatientName(note?.patientId ? 'Loading patient…' : 'Name Unknown');
    if (note?.patientId) patientRequest('getPatient', { patientId: note.patientId }).then(result => { if (active) setPatientName(result.patient.name); }).catch(() => { if (active) setPatientName('Patient unavailable'); });
    return () => { active = false; };
  }, [note?.patientId]);
  const close = async () => { if (!busy && await guard.confirm()) onClose?.(); };
  const edit = text => { setDraft(text); setConfirmation(null); requestRef.current = null; setMessage(''); };
  const save = async (token) => {
    if (busy || !note) return false; setBusy(true); setMessage('');
    requestRef.current ??= crypto.randomUUID();
    try {
      const result = await patientRequest('saveNote', { timestamp: note.timestamp, note: draft, expectedVersion: note.version,
        requestId: requestRef.current, ...(token ? { confirmationToken: token } : {}), confirmContextReview: contextConfirmed });
      if (result.status === 'CONFIRMATION_REQUIRED') { setConfirmation(result); return 'confirmation'; }
      if (result.status === 'CONTEXT_REVIEW_REQUIRED') { setMessage('Review this note against its patient and visit details, then confirm the review below.'); return; }
      setNote(result.note); setDraft(result.note.note); setMetadata(result.note); setConfirmation(null); setMessage(result.message || 'Saved.'); requestRef.current = null; onSaved?.(result.note); guard.saved(); return true;
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const guard = useDraftGuard({ dirty: desktopSave && dirty, busy, save: () => save(), discard: () => { setDraft(note.note); setConfirmation(null); requestRef.current = null; } });
  const reload = async () => {
    if (!await guard.confirm()) return;
    setBusy(true); try { const result = await patientRequest('getSavedNote', { timestamp }); setNote(result.note); setDraft(result.note.note || ''); setMetadata(result.note); setConfirmation(null); requestRef.current = null; setMessage('Saved note loaded.'); } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const saveMetadata = async (confirmed = false) => {
    if (dirty) { setMessage('Save or discard the note draft before changing patient or visit details.'); return; }
    setBusy(true); setMessage('');
    try {
      let patientId = metadata.patientId || null;
      if (patientId && metadata.patientName) await patientRequest('createPatient', { patientId, name: metadata.patientName });
      const result = await patientRequest('updateVisitMetadata', { timestamp, expectedVersion: note.version, patientId,
        dateOfService: metadata.dateOfService || null, dateOfInjury: metadata.dateOfInjury || null, visitType: metadata.visitType || null, contextMode: metadata.contextMode || 'patient',
        ...(metadata.visitLabel?.trim() ? { visitLabel: metadata.visitLabel.trim() } : {}), confirmContextReview: confirmed });
      if (result.status === 'CONTEXT_REVIEW_REQUIRED') {
        setBusy(false);
        if (window.confirm('Changing the patient or visit details does not rewrite the clinical note. Mark this note for review and continue?')) return saveMetadata(true);
        return;
      }
      setNote(result.note); setMetadata(result.note); setShowMetadata(false); setMessage('Visit details saved.'); onSaved?.(result.note);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const retryGeneration = async () => {
    if (!await guard.confirm()) return;
    setBusy(true); setMessage('Generating from the saved recording…');
    try { const saved = await retrySavedGeneration(note); setNote(saved); setDraft(saved.note); setMetadata(saved); onSaved?.(saved); setMessage('Generated note saved.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const reviewSuggestion = async (field, action) => {
    if (dirty) { setMessage('Save or discard the note draft before reviewing profile suggestions.'); return; }
    setBusy(true);
    try {
      const result = await patientRequest('reviewProfileSuggestions', { timestamp, expectedVersion: note.version, field, action });
      setNote(result.note); setMetadata(result.note); onSaved?.(result.note); setMessage(action === 'accept' ? 'Patient profile updated. Existing clinical notes are unchanged.' : 'Suggestion dismissed.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <section className="patient-note-editor" aria-busy={busy}>
    <div className="patient-toolbar"><h2 tabIndex={-1} ref={headingRef}>{note?.visitLabel || note?.noteLabel || 'Saved note'}</h2>{onClose && <button type="button" disabled={busy} onClick={close}>Close</button>}</div>
    {guard.dialog}
    {message && <p role="alert">{message}</p>}
    {!note ? <p role="status">Loading saved note…</p> : <>
      <p><strong>{patientName}</strong></p><p className="patient-help">{note.dateOfService || 'Service date not confirmed'} · {note.visitType || 'Visit type not set'} · {dirty ? 'Unsaved draft' : 'Saved version'}</p>
      {note.patientAssignmentError && <p role="alert">The new patient name is already in use. This recording was kept unassigned. Choose the existing patient or a distinct name in Patient and visit details.</p>}
      {note.contextSummary && <p className="patient-help">History used: {note.contextSummary.includedCount} visits. {note.contextSummary.omittedCount > 0 && `${note.contextSummary.omittedCount} earlier visits were omitted by selection or the history size limit.`}</p>}
      {(note.diagnosisReviewRequired || note.needsContextReview) && <p className="patient-confirmation">This note needs clinical review before it can be used as patient history.</p>}
      {desktopSave ? <label>Note<textarea className="patient-note-text" value={draft} disabled={busy} onChange={event => edit(event.target.value)} /></label> : <div className="patient-note-read">{note.note}</div>}
      {desktopSave && note.needsContextReview && <label><span><input type="checkbox" checked={contextConfirmed} onChange={e => setContextConfirmed(e.target.checked)} /> I reviewed the note against the patient and visit details.</span></label>}
      {confirmation && <div className="patient-confirmation" role="status"><h3>Confirm the diagnosis list</h3><p>The edited text leaves a diagnosis change unclear. Confirm the proposed list or return to editing.</p>
        {confirmation.icdCodes.length ? <ul>{confirmation.icdCodes.map(item => <li key={item.code}>{item.code} — {item.description}</li>)}</ul> : <p>{confirmation.establishesSet ? 'No active diagnoses (explicit empty list).' : 'Diagnosis state remains unknown.'}</p>}
        <div className="patient-actions"><button disabled={busy} onClick={() => save(confirmation.confirmationToken)}>Confirm and save</button><button disabled={busy} onClick={() => { setConfirmation(null); guard.cancel(); }}>Keep editing</button></div>
      </div>}
      {(!note.ready || note.needsContextReview) && note.lastEditedBy !== 'clinician' && <button type="button" disabled={busy} onClick={retryGeneration}>Retry generation from saved recording</button>}
      <div className="patient-actions">
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(desktopSave ? draft : note.note || ''); setMessage('Note copied.'); } catch { setMessage('Copy failed. Select the note text to copy it.'); } }}>Copy note</button>
        {desktopSave && <button type="button" disabled={busy || (!dirty && !note.diagnosisReviewRequired && !note.needsContextReview)} onClick={() => save()}>{busy ? 'Saving…' : 'Save note'}</button>}
        <button type="button" disabled={busy} onClick={reload}>Reload saved note</button>
        <button type="button" disabled={busy} onClick={() => setShowMetadata(value => !value)}>Patient and visit details</button>
      </div>
      {note.patientId && Object.entries(note.profileSuggestions?.fields || {}).some(([, suggestion]) => suggestion.status === 'pending') && <aside className="patient-confirmation"><h3>Patient profile suggestions</h3>
        {Object.entries(note.profileSuggestions.fields).filter(([, suggestion]) => suggestion.status === 'pending').map(([field, suggestion]) => <div key={field}><p>{({ dateOfBirth: 'Date of birth', dateOfInjury: 'Date of injury', sex: 'Sex' })[field]}: {suggestion.value}{suggestion.stale ? ' · From an earlier note version; confirm it in the patient profile.' : ''}</p><div className="patient-actions"><button disabled={busy || dirty || suggestion.stale} onClick={() => reviewSuggestion(field, 'accept')}>Accept</button><button disabled={busy || dirty} onClick={() => reviewSuggestion(field, 'dismiss')}>Dismiss</button></div></div>)}
      </aside>}
      {showMetadata && <><PatientCapturePicker value={metadata} onChange={setMetadata} /><label>Visit label<input value={metadata.visitLabel || ''} onChange={e => setMetadata({ ...metadata, visitLabel: e.target.value })} /></label><button type="button" disabled={busy || dirty} onClick={() => saveMetadata()}>Save visit details</button></>}
    </>}
  </section>;
}
