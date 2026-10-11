import { randomId } from '../../utils/randomId';
import React, { useEffect, useRef, useState } from 'react';
import { localDate, patientRequest } from '../../services/patientNotes';
import './Patients.css';

const normalizedName = name => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export default function PatientCapturePicker({ value, onChange, showVisitDetails = false, searchPlaceholder }) {
  const [search, setSearch] = useState(''); const [patients, setPatients] = useState([]);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [cursor, setCursor] = useState(null);
  const requestRef = useRef(0);
  const checkingRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const query = search.trim().replace(/\s+/g, ' ');
  const current = value || { dateOfService: localDate(), visitType: null, contextMode: 'patient' };
  useEffect(() => {
    let active = true; const request = ++requestRef.current;
    setPatients([]); setCursor(null); setError(''); setLoading(false);
    if (!query) return undefined;
    const timer = setTimeout(async () => {
      if (!active || request !== requestRef.current) return;
      setLoading(true); setError('');
      try { const page = await patientRequest('listPatients', { search: query, limit: 25 });
        if (active && request === requestRef.current) { setPatients(page.items.filter(patient => !patient.deletionPending)); setCursor(page.nextCursor); }
      } catch (failure) { if (active && request === requestRef.current) setError(failure.message); }
      finally { if (active && request === requestRef.current) setLoading(false); }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  const change = (fields) => onChange({ ...current, ...fields });
  const clearPatient = () => {
    change({ patientId: null, patientName: undefined, displayName: '', dateOfInjury: null, visitType: null, contextMode: 'patient' });
    setSearch('');
  };
  const selected = current.patientId ? (current.displayName || current.patientName || 'Selected patient') : 'Unassigned';
  const more = async () => {
    const request = requestRef.current; setLoading(true);
    try { const page = await patientRequest('listPatients', { search: query, cursor, limit: 25 });
      if (request === requestRef.current) { setPatients(old => [...old, ...page.items.filter(patient => !patient.deletionPending)]); setCursor(page.nextCursor); }
    } catch (failure) { if (request === requestRef.current) setError(failure.message); }
    finally { if (request === requestRef.current) setLoading(false); }
  };
  const addNew = async () => {
    if (checkingRef.current || !query) return;
    checkingRef.current = true; setChecking(true); setError('');
    const request = ++requestRef.current; setLoading(false);
    try {
      let nextCursor;
      do {
        const page = await patientRequest('listPatients', { search: query, limit: 25, ...(nextCursor ? { cursor: nextCursor } : {}) });
        if (request !== requestRef.current) return;
        const existing = page.items.find(patient => normalizedName(patient.name) === normalizedName(query));
        if (existing) {
          setPatients(old => old.some(patient => patient.patientId === existing.patientId) ? old : [existing, ...old]);
          setError('A patient with this name already exists. Select their name from the results below.');
          return;
        }
        nextCursor = page.nextCursor;
      } while (nextCursor);
      change({ patientId: randomId(), patientName: query, displayName: query, dateOfInjury: null, visitType: showVisitDetails ? null : 'initialExam', contextMode: 'patient' });
      setSearch('');
    } catch {
      if (request === requestRef.current) setError('We could not check whether this patient already exists. Please try Add New again, or select an existing patient.');
    } finally { checkingRef.current = false; setChecking(false); }
  };
  if (current.patientId && !showVisitDetails) return <div className="patient-capture patient-capture-selected">
    <div className="patient-selected-name">{selected}</div>
    <button type="button" className="patient-clear-selection" aria-label="Clear patient selection" title="Choose another patient" onClick={clearPatient}>×</button>
  </div>;
  return <fieldset className="patient-capture"><legend>{showVisitDetails ? 'Patient and visit' : 'Patient Name'}</legend>
    {showVisitDetails && <p className="patient-selection">{selected}</p>}
    <label>{showVisitDetails && 'Find a patient'}<input aria-label="Find a patient" className={showVisitDetails ? undefined : 'patient-recording-search'} value={search} placeholder={searchPlaceholder || (showVisitDetails ? 'Type a patient name' : 'Select Existing Patient, Add New or Leave Unassigned')} onChange={event => setSearch(event.target.value)} type="search" autoComplete="off" /></label>
    {showVisitDetails && !query && <p className="patient-help">Search by name, or leave this visit unassigned.</p>}
    {loading && <p role="status">Loading patients…</p>}
    {error && <p className="patient-picker-error" role="alert">{error}</p>}
    {query && <div className="patient-picker-list" aria-label="Matching patients">
      {patients.map(patient => <button type="button" key={patient.patientId} aria-pressed={current.patientId === patient.patientId}
        onClick={() => { change({ patientId: patient.patientId, patientName: undefined, displayName: patient.name, dateOfInjury: patient.dateOfInjury, visitType: showVisitDetails ? null : 'followUp', contextMode: 'patient' }); setSearch(''); }}>{patient.name}<small>{patient.visitCount} visits</small></button>)}
    </div>}
    {query && cursor && <button type="button" disabled={loading} onClick={more}>More patients</button>}
    <div className="patient-actions">
      {query && <button type="button" disabled={checking} onClick={addNew}>{checking ? 'Checking patient…' : `Add New “${query}”`}</button>}
      {current.patientId && <button type="button" onClick={clearPatient}>Unassigned visit</button>}
    </div>
    {showVisitDetails && <div className="patient-field-grid">
      <label>Date of service<input type="date" required max={localDate()} value={current.dateOfService || localDate()} onChange={e => change({ dateOfService: e.target.value })} /></label>
      <label>Date of injury (optional)<input type="date" max={localDate()} value={current.dateOfInjury || ''} onChange={e => change({ dateOfInjury: e.target.value })} /></label>
      <label>Visit type<select value={current.visitType || ''} onChange={e => change({ visitType: e.target.value || null })}>
        <option value="">Automatic</option><option value="initialExam">Initial exam</option><option value="reExam">Re-exam</option><option value="followUp">Follow-up</option>
      </select></label>
    </div>}
    {showVisitDetails && current.patientId && <label className="patient-inline"><input type="checkbox" checked={current.contextMode !== 'none'} onChange={e => change({ contextMode: e.target.checked ? 'patient' : 'none' })} /> Use saved patient history</label>}
  </fieldset>;
}
