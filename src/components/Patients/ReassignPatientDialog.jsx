import React, { useEffect, useRef, useState } from 'react';
import { patientRequest } from '../../services/patientNotes';
import PatientDialog from './PatientDialog';
import PatientCapturePicker from './PatientCapturePicker';
import PatientName from './PatientName';

export default function ReassignPatientDialog({ timestamp, onClose, onAssigned }) {
  const [note, setNote] = useState(null);
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    patientRequest('getSavedNote', { timestamp }).then(result => {
      if (active) setNote(result.note);
    }).catch(() => { if (active) setError('This visit could not be loaded. Close and try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [timestamp]);
  const assign = async () => {
    if (pending.current || !note || !selection?.patientId || selection.patientId === note.patientId) return;
    pending.current = true; setBusy(true); setError('');
    try {
      if (selection.patientName) await patientRequest('createPatient', { patientId: selection.patientId, name: selection.patientName });
      const result = await patientRequest('assignNoteToPatient', {
        timestamp: note.timestamp, expectedVersion: note.version,
        patientId: selection.patientId, confirmContextReview: true,
      });
      if (result.status !== 'UPDATED' || !result.note) throw new Error('Re-assignment was not confirmed. Please try again.');
      onAssigned(result.note);
    } catch (failure) {
      setError(failure.code === 'CONFLICT'
        ? 'This visit changed elsewhere. Cancel and reopen Re-assign patient to load the latest version.'
        : failure.code === 'PATIENT_NAME_CONFLICT'
          ? 'That patient already exists. Clear your selection and choose their name from the search results.'
          : failure.message || 'Re-assignment failed. Your selection is preserved; please try again.');
    } finally { pending.current = false; setBusy(false); }
  };
  return <PatientDialog title="Re-assign patient" className="patient-reassign-dialog" busy={busy} onClose={onClose}>
    {loading && <p role="status">Loading visit…</p>}
    {error && <p role="alert">{error}</p>}
    {note && <>
      <div className="patient-reassign-current"><span>Currently assigned to</span><PatientName patientId={note.patientId} unassignedLabel="Unassigned" /></div>
      <fieldset className="visit-details-fields" disabled={busy}>
        <PatientCapturePicker value={selection} onChange={setSelection} searchPlaceholder="Select Existing Patient or Add New" />
      </fieldset>
      <p className="patient-help">The note text stays the same. Review it for the correct patient before using it as patient history.</p>
    </>}
    <div className="patient-actions patient-reassign-actions"><button type="button" disabled={busy || loading || !note || !selection?.patientId || selection.patientId === note.patientId} onClick={assign}>{busy ? 'Re-assigning…' : 'Re-Assign'}</button><button type="button" disabled={busy} onClick={onClose}>Cancel</button></div>
  </PatientDialog>;
}
