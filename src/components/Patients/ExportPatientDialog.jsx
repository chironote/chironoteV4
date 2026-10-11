import React, { useEffect, useRef, useState } from 'react';
import { patientRequest, exportPatientNotes, localDate } from '../../services/patientNotes';
import PatientDialog from './PatientDialog';
import { leaveDrafts } from './draftNavigation';
import SavedNoteEditor from './SavedNoteEditor';
import { SignatureDialog } from './SignatureSettings';

const ready = note => note.ready === true;
const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not recorded';

export default function ExportPatientDialog({ patient, desktopSave, onClose }) {
  const [notes, setNotes] = useState([]); const [selected, setSelected] = useState(new Set());
  const [acknowledged, setAcknowledged] = useState(new Set()); const [signature, setSignature] = useState(null);
  const [dates, setDates] = useState({ dateOfBirth: patient.dateOfBirth || '', dateOfInjury: patient.dateOfInjury || '' });
  const [datesConfirmed, setDatesConfirmed] = useState(false); const [month, setMonth] = useState(localDate().slice(0, 7));
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(true); const [loaded, setLoaded] = useState(false);
  const [configure, setConfigure] = useState(false); const [editTimestamp, setEditTimestamp] = useState(null);
  const allRef = useRef(null);
  const load = async (preserve = false) => {
    setBusy(true); setMessage(''); setLoaded(false);
    try {
      const inventory = []; let cursor; const seen = new Set(); const cursors = new Set();
      do {
        const result = await patientRequest('getPatientVisits', { patientId: patient.patientId, completeInventory: true, limit: 50, ...(cursor ? { cursor } : {}) });
        for (const note of result.notes) if (!seen.has(note.timestamp)) { seen.add(note.timestamp); inventory.push(note); }
        if (result.nextCursor && cursors.has(result.nextCursor)) throw new Error('The visit list changed. Please reload it.');
        cursor = result.nextCursor; if (cursor) cursors.add(cursor);
      } while (cursor);
      setNotes(inventory); if (!preserve) setSelected(new Set(inventory.filter(ready).map(note => note.timestamp)));
      else setSelected(old => new Set([...old].filter(key => inventory.some(note => note.timestamp === key && ready(note)))));
      setSignature(await patientRequest('getSignature')); setLoaded(true);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const eligible = notes.filter(ready); const chosen = notes.filter(note => selected.has(note.timestamp));
  useEffect(() => { if (allRef.current) allRef.current.indeterminate = selected.size > 0 && selected.size < eligible.length; }, [selected.size, eligible.length]);
  const toggle = (setter, values, key) => setter(new Set(values.has(key) ? [...values].filter(value => value !== key) : [...values, key]));
  const missingService = chosen.some(note => !note.dateOfService);
  const conflicts = chosen.filter(note => note.dateOfInjury && note.dateOfInjury !== dates.dateOfInjury);
  const unreviewed = chosen.some(note => note.needsContextReview && !acknowledged.has(note.timestamp));
  const signatureReady = Boolean(signature?.name?.trim() && /^\d{10}$/.test(signature?.npi || ''));
  const create = async () => {
    setBusy(true); setMessage('');
    try {
      await exportPatientNotes({ schemaVersion: 1, patientId: patient.patientId, noteTimestamps: [...selected],
        exportDetails: { dateOfBirth: dates.dateOfBirth || null, dateOfInjury: dates.dateOfInjury || null },
        acknowledgedReviewNoteTimestamps: [...acknowledged].filter(key => selected.has(key)) });
      setMessage('PDF downloaded. It contains the saved versions of the selected visits.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const [year, monthNumber] = month.split('-').map(Number);
  const calendarDays = year && monthNumber ? new Date(year, monthNumber, 0).getDate() : 0;
  const offset = calendarDays ? new Date(year, monthNumber - 1, 1).getDay() : 0;
  const marked = new Set(chosen.filter(note => note.dateOfService?.startsWith(month)).map(note => Number(note.dateOfService.slice(-2))));
  return <PatientDialog title={`Export patient: ${patient.name}`} busy={busy} onClose={onClose}>
    <p>This PDF uses saved notes. Save any desktop draft before exporting.</p>
    {message && <p role="alert">{message}</p>}{busy && <p role="status">{loaded ? 'Creating PDF…' : 'Loading the complete saved inventory…'}</p>}
    <div className="patient-field-grid">{[['dateOfBirth', 'Date of birth'], ['dateOfInjury', 'Date of injury']].map(([key, label]) => <label key={key}>{label}<input type="date" max={localDate()} disabled={busy} value={dates[key]} onChange={e => { setDates({ ...dates, [key]: e.target.value }); setDatesConfirmed(false); }} /><small>Leave blank for Not recorded / Not applicable.</small></label>)}</div>
    <label className="patient-check"><input type="checkbox" disabled={busy} checked={datesConfirmed} onChange={e => setDatesConfirmed(e.target.checked)} /> I confirm these export dates, including any missing date.</label>
    <p>{signatureReady ? `Printed signature: ${signature.name} · NPI: ${signature.npi}` : 'Configure your name and NPI before creating this PDF.'} <button type="button" disabled={busy} onClick={() => setConfigure(true)}>Configure Signature</button></p>
    <label>Calendar illustration<input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
    <div className="patient-calendar" aria-label="Selected visit dates in this month; does not filter selection">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <strong key={day}>{day}</strong>)}{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: calendarDays }, (_, index) => <span key={index} className={marked.has(index + 1) ? 'selected' : ''}>{index + 1}</span>)}</div>
    <p>{selected.size} selected{loaded ? ` of ${eligible.length} complete saved visits` : ''}. Changing the calendar month does not filter this list.</p>
    <label className="patient-check"><input ref={allRef} type="checkbox" disabled={busy || !loaded || !eligible.length} checked={eligible.length > 0 && selected.size === eligible.length} onChange={e => setSelected(new Set(e.target.checked ? eligible.map(note => note.timestamp) : []))} /> Select all complete notes</label>
    <ul className="patient-export-list">{notes.map((note, index) => <li key={note.timestamp}>
      <label className="patient-check"><input type="checkbox" disabled={busy || !ready(note)} checked={selected.has(note.timestamp)} onChange={() => toggle(setSelected, selected, note.timestamp)} /><span>{dateLabel(note.dateOfService)} · Visit {index + 1}<small>{note.visitLabel || note.noteLabel || 'Untitled visit'}{!ready(note) ? ' · Incomplete' : ''}</small></span></label>
      {!note.dateOfService && <button type="button" disabled={busy} onClick={() => setEditTimestamp(note.timestamp)}>Confirm saved service date</button>}
      {note.needsContextReview && selected.has(note.timestamp) && <label className="patient-check"><input type="checkbox" disabled={busy} checked={acknowledged.has(note.timestamp)} onChange={() => toggle(setAcknowledged, acknowledged, note.timestamp)} /> I acknowledge that this reassigned note still requires clinical review.</label>}
    </li>)}</ul>
    {missingService && <p role="alert">Confirm missing service dates in the saved visit details before exporting.</p>}
    {conflicts.length > 0 && <p role="alert">The injury date conflicts with {conflicts.length} selected visit(s): {conflicts.map(note => dateLabel(note.dateOfService)).join(', ')}. Change the export date or deselect those visits.</p>}
    <div className="patient-actions"><button type="button" disabled={busy || !loaded || !selected.size || !datesConfirmed || !signatureReady || missingService || conflicts.length > 0 || unreviewed} onClick={create}>Create PDF</button><button disabled={busy} onClick={() => load(true)}>Reload saved inventory</button><button disabled={busy} onClick={onClose}>Cancel</button></div>
    {configure && <SignatureDialog onClose={() => setConfigure(false)} onSaved={saved => setSignature(saved)} />}
    {editTimestamp && <PatientDialog title="Confirm saved visit details" onClose={() => leaveDrafts(() => { setEditTimestamp(null); load(true); })}><SavedNoteEditor timestamp={editTimestamp} desktopSave={desktopSave} onClose={() => { setEditTimestamp(null); load(true); }} /></PatientDialog>}
  </PatientDialog>;
}
