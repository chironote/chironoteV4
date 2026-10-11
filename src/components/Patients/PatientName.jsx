import React from 'react';
import usePatientNames from './usePatientNames';
import { patientNotesEnabled } from '../../services/patientNotes';
export default function PatientName({ patientId, onClick, unassignedLabel = 'Name Unknown' }) {
  const names = usePatientNames([{ patientId }]);
  const name = names[patientId];
  const label = patientId ? name || 'Loading patient…' : unassignedLabel;
  if (!patientNotesEnabled) return null;
  return onClick ? <button type="button" className="history-patient-name patient-name-link" onClick={onClick} title="Re-assign patient" aria-label={`Re-assign patient: ${label}`}>{label}</button>
    : <small className="history-patient-name" style={{ display: 'block', fontWeight: 600 }}>{label}</small>;
}
