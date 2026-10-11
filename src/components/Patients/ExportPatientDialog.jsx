import React, { useEffect, useRef, useState } from 'react';
import { patientRequest, exportPatientNotes, localDate } from '../../services/patientNotes';
import PatientDialog from './PatientDialog';
import VisitDetailsDialog from './VisitDetailsDialog';
import { SignatureDialog } from './SignatureSettings';

const ready = note => note.ready === true;
const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not recorded';
const matchesRange = (note, scope, range) => scope === 'all' || Boolean(range.from && range.to && note.dateOfService && note.dateOfService >= range.from && note.dateOfService <= range.to);

export default function ExportPatientDialog({ patient, onClose }) {
  const [notes, setNotes] = useState([]); const [selected, setSelected] = useState(new Set());
  const [scope, setScope] = useState('all'); const [range, setRange] = useState({ from: '', to: '' });
  const [acknowledged, setAcknowledged] = useState(new Set()); const [signature, setSignature] = useState(null);
  const [dates, setDates] = useState({ dateOfBirth: patient.dateOfBirth || '', dateOfInjury: patient.dateOfInjury || '' });
  const [datesConfirmed, setDatesConfirmed] = useState(false); const [editDates, setEditDates] = useState(false);
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
        if (result.nextCursor && cursors.has(result.nextCursor)) throw new Error('The note list changed while loading. Please try again.');
        cursor = result.nextCursor; if (cursor) cursors.add(cursor);
      } while (cursor);
      const available = inventory.filter(note => ready(note) && matchesRange(note, scope, range));
      setNotes(inventory);
      setSelected(old => new Set(available.filter(note => !preserve || old.has(note.timestamp)).map(note => note.timestamp)));
      setSignature(await patientRequest('getSignature')); setLoaded(true);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const matching = notes.filter(note => matchesRange(note, scope, range));
  const eligible = matching.filter(ready);
  const chosen = eligible.filter(note => selected.has(note.timestamp));
  const undated = scope === 'range' ? notes.filter(note => ready(note) && !note.dateOfService) : [];
  const rangeError = scope === 'range' && (!range.from || !range.to ? 'Choose a start and end date.' : range.from > range.to ? 'End date must be on or after start date.' : '');
  useEffect(() => { if (allRef.current) allRef.current.indeterminate = chosen.length > 0 && chosen.length < eligible.length; }, [loaded, chosen.length, eligible.length]);
  const changeRange = (nextScope, nextRange = range) => {
    setScope(nextScope); setRange(nextRange); setMessage('');
    setSelected(new Set(notes.filter(note => ready(note) && matchesRange(note, nextScope, nextRange)).map(note => note.timestamp)));
  };
  const chooseCustomRange = () => {
    const savedDates = notes.filter(ready).map(note => note.dateOfService).filter(Boolean).sort();
    changeRange('range', range.from && range.to ? range : { from: savedDates[0] || '', to: savedDates.at(-1) || '' });
  };
  const toggle = (setter, values, key) => setter(new Set(values.has(key) ? [...values].filter(value => value !== key) : [...values, key]));
  const missingService = chosen.some(note => !note.dateOfService);
  const conflicts = chosen.filter(note => note.dateOfInjury && note.dateOfInjury !== dates.dateOfInjury);
  const unreviewed = chosen.some(note => note.needsContextReview && !acknowledged.has(note.timestamp));
  const signatureReady = Boolean(signature?.name?.trim() && /^\d{10}$/.test(signature?.npi || ''));
  const blockers = loaded ? [
    rangeError,
    !rangeError && !chosen.length && 'Select at least one saved note.',
    !datesConfirmed && 'Confirm the patient dates.',
    !signatureReady && 'Add your signature name and 10-digit NPI.',
    missingService && 'Add the missing visit dates.',
    conflicts.length > 0 && 'Resolve the injury dates or uncheck the affected notes.',
    unreviewed && 'Acknowledge clinical review for the marked notes.',
  ].filter(Boolean) : [];
  const create = async () => {
    if (busy || !loaded || blockers.length) return;
    setBusy(true); setMessage('');
    try {
      const keys = chosen.map(note => note.timestamp);
      await exportPatientNotes({ schemaVersion: 1, patientId: patient.patientId, noteTimestamps: keys,
        exportDetails: { dateOfBirth: dates.dateOfBirth || null, dateOfInjury: dates.dateOfInjury || null },
        acknowledgedReviewNoteTimestamps: [...acknowledged].filter(key => keys.includes(key)) });
      setMessage('PDF downloaded.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const actions = <div className="patient-actions patient-export-actions"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="button" aria-describedby={blockers.length ? 'pdf-requirements' : undefined} disabled={busy || !loaded || blockers.length > 0} onClick={create}>{busy && loaded ? 'Creating PDF…' : 'Create PDF'}</button></div>;
  return <PatientDialog title="Export notes" className="patient-export-dialog" busy={busy} onClose={onClose} footer={actions}>
    <p className="patient-export-patient">{patient.name}</p>
    <p className="patient-help patient-export-intro">Export saved notes. Save any clipboard changes first.</p>
    <div className="patient-export-scope" role="group" aria-label="Notes to export">
      <button type="button" aria-pressed={scope === 'all'} disabled={busy} onClick={() => changeRange('all')}>All notes</button>
      <button type="button" aria-pressed={scope === 'range'} disabled={busy} onClick={chooseCustomRange}>Custom range</button>
    </div>
    {scope === 'range' && <div className="patient-field-grid patient-export-range">
      <label>From<input type="date" aria-label="From date" disabled={busy} value={range.from} aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? 'export-range-error' : undefined} onChange={e => changeRange('range', { ...range, from: e.target.value })} /></label>
      <label>To<input type="date" aria-label="To date" disabled={busy} value={range.to} aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? 'export-range-error' : undefined} onChange={e => changeRange('range', { ...range, to: e.target.value })} /></label>
    </div>}
    {rangeError && <p id="export-range-error" className="patient-export-warning" role="alert">{rangeError}</p>}
    {busy && <p role="status">{loaded ? 'Creating PDF…' : 'Loading notes…'}</p>}
    {loaded && <>
      <div className="patient-export-list-heading">
        <label className="patient-check"><input ref={allRef} type="checkbox" disabled={busy || !eligible.length} checked={eligible.length > 0 && chosen.length === eligible.length} onChange={e => setSelected(new Set(e.target.checked ? eligible.map(note => note.timestamp) : []))} /> Select all</label>
        <span aria-live="polite">{chosen.length} of {eligible.length} selected</span>
      </div>
      <ul className="patient-export-list">{matching.map(note => <li key={note.timestamp}>
        <label className="patient-check patient-export-note"><input type="checkbox" disabled={busy || !ready(note)} checked={ready(note) && selected.has(note.timestamp)} onChange={() => toggle(setSelected, selected, note.timestamp)} /><span className="patient-export-note-copy"><span>{note.visitLabel || note.noteLabel || 'Untitled note'}</span><small>{note.dateOfService ? dateLabel(note.dateOfService) : 'Visit date missing'}{!ready(note) ? ' · Not ready to export' : ''}</small></span></label>
        {!note.dateOfService && ready(note) && <button type="button" className="patient-export-link" disabled={busy} onClick={() => setEditTimestamp(note.timestamp)}>Add visit date</button>}
        {conflicts.includes(note) && <p className="patient-export-warning">Injury date: {dateLabel(note.dateOfInjury)}. Update the PDF details below or uncheck this note.</p>}
        {note.needsContextReview && selected.has(note.timestamp) && <label className="patient-check patient-export-review"><input type="checkbox" disabled={busy} checked={acknowledged.has(note.timestamp)} onChange={() => toggle(setAcknowledged, acknowledged, note.timestamp)} /> I acknowledge this reassigned note still needs clinical review.</label>}
      </li>)}</ul>
      {!matching.length && !rangeError && <p className="patient-help">{scope === 'range' ? 'No notes in this date range.' : 'No saved notes yet.'}</p>}
      {undated.length > 0 && <div className="patient-export-undated"><p className="patient-help">{undated.length} {undated.length === 1 ? 'note needs a visit date' : 'notes need visit dates'} to match a date range.</p>{undated.map(note => <button type="button" className="patient-export-link" key={note.timestamp} disabled={busy} onClick={() => setEditTimestamp(note.timestamp)}>Add date: {note.visitLabel || note.noteLabel || 'Untitled note'}</button>)}</div>}
      <section className="patient-export-details" aria-label="PDF details">
        <div className="patient-export-details-heading"><h3>PDF details</h3><button type="button" className="patient-export-link" disabled={busy} aria-expanded={editDates} aria-controls="export-patient-dates" onClick={() => setEditDates(!editDates)}>{editDates ? 'Done' : 'Edit dates'}</button></div>
        {editDates ? <div id="export-patient-dates" className="patient-field-grid">{[['dateOfBirth', 'Date of birth'], ['dateOfInjury', 'Date of injury']].map(([key, label]) => <label key={key}>{label}<input type="date" max={localDate()} disabled={busy} value={dates[key]} onChange={e => { setDates({ ...dates, [key]: e.target.value }); setDatesConfirmed(false); }} /></label>)}<small className="patient-help">Blank dates print as Not recorded / Not applicable.</small></div> : <dl id="export-patient-dates" className="patient-export-date-summary"><div><dt>Birth date</dt><dd>{dateLabel(dates.dateOfBirth)}</dd></div><div><dt>Injury date</dt><dd>{dateLabel(dates.dateOfInjury)}</dd></div></dl>}
        <label className="patient-check"><input type="checkbox" aria-label="Confirm patient dates" disabled={busy} checked={datesConfirmed} onChange={e => setDatesConfirmed(e.target.checked)} /> These dates are correct, including any left blank.</label>
        <div className="patient-export-signature"><span>{signatureReady ? <>Signed by {signature.name}<small>NPI {signature.npi}</small></> : 'Signature not configured'}</span><button type="button" className="patient-export-link" disabled={busy} onClick={() => setConfigure(true)}>{signatureReady ? 'Edit signature' : 'Set up signature'}</button></div>
      </section>
    </>}
    {blockers.length > 0 && <p id="pdf-requirements" className="patient-help patient-export-requirements">{blockers.join(' ')}</p>}
    {message && <p role={loaded ? 'status' : 'alert'} className="patient-export-result">{message}{!loaded && !busy && <> <button type="button" className="patient-export-link" onClick={() => load(notes.length > 0)}>Try again</button></>}</p>}
    {configure && <SignatureDialog onClose={() => setConfigure(false)} onSaved={saved => setSignature(saved)} />}
    {editTimestamp && <VisitDetailsDialog timestamp={editTimestamp} onClose={() => { setEditTimestamp(null); load(true); }} />}
  </PatientDialog>;
}
