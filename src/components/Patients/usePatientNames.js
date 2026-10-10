import { useEffect, useState } from 'react';
import { patientNotesEnabled, patientRequest } from '../../services/patientNotes';
export default function usePatientNames(notes) {
  const [names, setNames] = useState({}); const [revision, setRevision] = useState(0);
  const ids = [...new Set(notes.map(note => note.patientId).filter(Boolean))].sort().join(',');
  useEffect(() => { const refresh = () => setRevision(value => value + 1); window.addEventListener('patient-profile-changed', refresh); return () => window.removeEventListener('patient-profile-changed', refresh); }, []);
  useEffect(() => {
    if (!patientNotesEnabled || !ids) { setNames({}); return undefined; }
    let active = true;
    // Bound concurrent account reads while names remain searchable after rename.
    const pending = ids.split(','); const result = {};
    const worker = async () => { while (active && pending.length) { const patientId = pending.shift(); try { result[patientId] = (await patientRequest('getPatient', { patientId })).patient.name; } catch { result[patientId] = ''; } } };
    Promise.all([worker(), worker(), worker(), worker()]).then(() => { if (active) setNames(result); });
    return () => { active = false; };
  }, [ids, revision]);
  return names;
}
