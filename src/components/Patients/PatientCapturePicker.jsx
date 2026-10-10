import React, { useEffect, useRef, useState } from 'react';
import { localDate, patientRequest } from '../../services/patientNotes';
import './Patients.css';

export default function PatientCapturePicker({ value, onChange }) {
  const [search, setSearch] = useState(''); const [patients, setPatients] = useState([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [cursor, setCursor] = useState(null);
  const requestRef = useRef(0);
  const current = value || { dateOfService: localDate(), visitType: null, contextMode: 'patient' };
  useEffect(() => {
    let active = true; const request = ++requestRef.current; const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try { const page = await patientRequest('listPatients', { search, limit: 25 });
        if (active && request === requestRef.current) { setPatients(page.items); setCursor(page.nextCursor); }
      } catch (failure) { if (active && request === requestRef.current) setError(failure.message); }
      finally { if (active && request === requestRef.current) setLoading(false); }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);
  const change = (fields) => onChange({ ...current, ...fields });
  const selected = current.patientId ? (current.displayName || current.patientName || 'Selected patient') : 'Unassigned';
  const more = async () => {
    const request = requestRef.current; setLoading(true);
    try { const page = await patientRequest('listPatients', { search, cursor, limit: 25 });
      if (request === requestRef.current) { setPatients(old => [...old, ...page.items]); setCursor(page.nextCursor); }
    } catch (failure) { setError(failure.message); } finally { setLoading(false); }
  };
  return <fieldset className="patient-capture"><legend>Patient and visit</legend>
    <p className="patient-selection">{selected}</p>
    <label>Find a patient<input value={search} onChange={event => setSearch(event.target.value)} type="search" autoComplete="off" /></label>
    {loading && <p role="status">Loading patients…</p>}
    {error && <p role="alert">{error} You can record an unassigned visit and assign it later.</p>}
    <div className="patient-picker-list" aria-label="Matching patients">
      {patients.map(patient => <button type="button" key={patient.patientId} aria-pressed={current.patientId === patient.patientId}
        onClick={() => change({ patientId: patient.patientId, patientName: undefined, displayName: patient.name, dateOfInjury: patient.dateOfInjury, visitType: null })}>{patient.name}<small>{patient.visitCount} visits</small></button>)}
    </div>
    {cursor && <button type="button" disabled={loading} onClick={more}>More patients</button>}
    <div className="patient-actions">
      {search.trim() && <button type="button" onClick={() => change({ patientId: crypto.randomUUID(), patientName: search.trim(), displayName: search.trim(), visitType: null })}>Use new patient “{search.trim()}”</button>}
      <button type="button" onClick={() => change({ patientId: null, patientName: undefined, displayName: '', dateOfInjury: null })}>Unassigned visit</button>
    </div>
    <div className="patient-field-grid">
      <label>Date of service<input type="date" required max={localDate()} value={current.dateOfService || localDate()} onChange={e => change({ dateOfService: e.target.value })} /></label>
      <label>Date of injury (optional)<input type="date" max={localDate()} value={current.dateOfInjury || ''} onChange={e => change({ dateOfInjury: e.target.value })} /></label>
      <label>Visit type<select value={current.visitType || ''} onChange={e => change({ visitType: e.target.value || null })}>
        <option value="">Automatic</option><option value="initialExam">Initial exam</option><option value="reExam">Re-exam</option><option value="followUp">Follow-up</option>
      </select></label>
    </div>
    <p className="patient-help">The first verified encounter uses Initial exam. Language is detected automatically.</p>
    {current.patientId && <label className="patient-inline"><input type="checkbox" checked={current.contextMode !== 'none'} onChange={e => change({ contextMode: e.target.checked ? 'patient' : 'none' })} /> Use saved patient history</label>}
  </fieldset>;
}
