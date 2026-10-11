import React, { useEffect, useState } from 'react';
import { patientRequest, retrySavedGeneration } from '../../services/patientNotes';
import PatientCapturePicker from './PatientCapturePicker';
import PatientDialog from './PatientDialog';

// Metadata stays in Patients; all clinical body edits belong to the clipboard.
export default function VisitDetailsDialog({ timestamp, onClose, onSaved, onOpenNote }) {
  const [note, setNote] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    patientRequest('getSavedNote', { timestamp }).then(result => {
      if (active) { setNote(result.note); setMetadata(result.note); }
    }).catch(error => { if (active) setMessage(error.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [timestamp]);
  const saveMetadata = async (confirmed = false, deleteEmptyPatient = false) => {
    if (note.patientId && note.patientId !== (metadata.patientId || null) && !deleteEmptyPatient) {
      if (!window.confirm("Changing the patient does not rewrite this note. If this is the original patient's last visit, their empty profile will be permanently deleted. This cannot be undone. Continue?")) return;
      return saveMetadata(true, true);
    }
    setBusy(true); setMessage('');
    try {
      let patientId = metadata.patientId || null;
      if (patientId && metadata.patientName) await patientRequest('createPatient', { patientId, name: metadata.patientName });
      const result = await patientRequest('updateVisitMetadata', { timestamp, expectedVersion: note.version, patientId,
        dateOfService: metadata.dateOfService || null, dateOfInjury: metadata.dateOfInjury || null, visitType: metadata.visitType || null, contextMode: metadata.contextMode || 'patient',
        ...(metadata.visitLabel?.trim() ? { visitLabel: metadata.visitLabel.trim() } : {}), confirmContextReview: confirmed, ...(deleteEmptyPatient ? { deleteEmptyPatient: true } : {}) });
      if (result.status === 'CONTEXT_REVIEW_REQUIRED') {
        setBusy(false);
        if (window.confirm('Changing the patient or visit details does not rewrite the clinical note. Mark this note for review and continue?')) return saveMetadata(true, deleteEmptyPatient);
        return;
      }
      if (result.status === 'PATIENT_DELETION_REQUIRED') {
        if (window.confirm("This is the original patient's last visit. Continuing will permanently delete their empty patient profile. This cannot be undone. Continue?")) return saveMetadata(confirmed, true);
        return;
      }
      if (result.status !== 'UPDATED' || !result.note) throw new Error('The visit update was not confirmed. Please retry.');
      setNote(result.note); setMetadata(result.note); setMessage('Visit details saved.'); onSaved?.(result.note);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const retryGeneration = async () => {
    setBusy(true); setMessage('Generating from the saved recording…');
    try { const saved = await retrySavedGeneration(note); setNote(saved); setMetadata(saved); onSaved?.(saved); setMessage('Generated note saved.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const reviewSuggestion = async (field, action) => {
    setBusy(true);
    try {
      const result = await patientRequest('reviewProfileSuggestions', { timestamp, expectedVersion: note.version, field, action });
      setNote(result.note); setMetadata(result.note); onSaved?.(result.note); setMessage(action === 'accept' ? 'Patient profile updated. Existing clinical notes are unchanged.' : 'Suggestion dismissed.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <PatientDialog title="Patient and visit details" busy={busy} onClose={onClose}>
    {message && <p role="alert">{message}</p>}
    {!note ? <p role="status">{busy ? 'Loading visit…' : 'Visit could not be loaded. Close and try again.'}</p> : <>
      <fieldset disabled={busy} className="visit-details-fields">
        <PatientCapturePicker value={metadata} onChange={setMetadata} showVisitDetails />
        <label>Visit label<input value={metadata.visitLabel || ''} onChange={event => setMetadata({ ...metadata, visitLabel: event.target.value })} /></label>
      </fieldset>
      <div className="patient-actions"><button disabled={busy} onClick={() => saveMetadata()}>Save visit details</button>
        {onOpenNote && <button disabled={busy} onClick={() => onOpenNote(note.timestamp)}>Open note in clipboard</button>}
      </div>
      {note.patientAssignmentError && <p role="alert">This recording was kept unassigned because the patient name already exists. Select the existing patient above.</p>}
      {note.needsContextReview && <p>Review the clinical note in the clipboard after changing patient or visit details.</p>}
      {(!note.ready || note.needsContextReview) && note.lastEditedBy !== 'clinician' && <button disabled={busy} onClick={retryGeneration}>Retry generation from saved recording</button>}
      {Object.entries(note.profileSuggestions?.fields || {}).some(([, suggestion]) => suggestion.status === 'pending') && <section><h3>Patient profile suggestions</h3>
        {Object.entries(note.profileSuggestions.fields).filter(([, suggestion]) => suggestion.status === 'pending').map(([field, suggestion]) => <div key={field}><p>{({ dateOfBirth: 'Date of birth', dateOfInjury: 'Date of injury', sex: 'Sex' })[field]}: {suggestion.value}{suggestion.stale ? ' · From an earlier note version; confirm it in the patient profile.' : ''}</p><div className="patient-actions"><button disabled={busy || suggestion.stale} onClick={() => reviewSuggestion(field, 'accept')}>Accept</button><button disabled={busy} onClick={() => reviewSuggestion(field, 'dismiss')}>Dismiss</button></div></div>)}
      </section>}
    </>}
  </PatientDialog>;
}
