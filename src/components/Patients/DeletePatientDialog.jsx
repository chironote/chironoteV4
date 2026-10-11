import React, { useEffect, useState } from 'react';
import { patientRequest } from '../../services/patientNotes';
import PatientDialog from './PatientDialog';

export default function DeletePatientDialog({ patient, onClose, onDeleted }) {
  const [summary, setSummary] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    patientRequest('getPatient', { patientId: patient.patientId, includeDeletionSummary: true }).then(result => {
      if (active) { if (!result.deletionSummary) setError("Patient deletion is not available in the current service release."); else setSummary(result.deletionSummary); }
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [patient.patientId]);
  const remove = async () => {
    if (busy || !confirmed || !summary) return;
    setBusy(true); setError('');
    try {
      let result;
      do {
        result = await patientRequest('updatePatient', { patientId: patient.patientId, action: 'delete', expectedVersion: summary.version, confirmPermanentDeletion: true });
      } while (result.status === 'DELETING');
      if (result.status !== 'DELETED') throw new Error('Deletion is not complete. Please retry to finish removing this patient.');
      onDeleted(patient.patientId);
    } catch (failure) { setError(failure.message || 'Deletion could not finish. Please retry.'); }
    finally { setBusy(false); }
  };
  return <PatientDialog title="Delete patient" busy={busy} onClose={onClose}>
    <p><strong>{patient.name}</strong></p>
    <p className="patient-delete-warning">Permanently delete this patient profile and all linked saved notes and transcripts. This cannot be undone in the app.</p>
    {!summary && !error && <p role="status">Checking linked visits…</p>}
    {summary && <p>{summary.visitCount} linked visit{summary.visitCount === 1 ? '' : 's'} will be removed.</p>}
    {error && <p role="alert">{error}</p>}
    <label className="patient-check"><input type="checkbox" checked={confirmed} disabled={busy || !summary} onChange={event => setConfirmed(event.target.checked)} /> I understand that the patient and their linked notes and transcripts will be permanently deleted.</label>
    <div className="patient-actions"><button type="button" className="patient-delete-button" disabled={busy || !summary || !confirmed} onClick={remove}>{busy ? 'Deleting…' : 'Delete Patient'}</button><button type="button" disabled={busy} onClick={onClose}>Cancel</button></div>
  </PatientDialog>;
}
