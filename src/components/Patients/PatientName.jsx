import React from 'react';
import usePatientNames from './usePatientNames';
import { patientNotesEnabled } from '../../services/patientNotes';
export default function PatientName({ patientId }) {
  const names = usePatientNames([{ patientId }]);
  const name = names[patientId];
  return patientNotesEnabled ? <small className="history-patient-name" style={{ display: 'block', fontWeight: 600 }}>{patientId ? name || 'Loading patient…' : 'Name Unknown'}</small> : null;
}
