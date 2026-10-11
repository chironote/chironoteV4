import React, { useEffect, useRef, useState } from 'react';
import { patientRequest, localDate } from '../../services/patientNotes';
import VisitDetailsDialog from './VisitDetailsDialog';
import ExportPatientDialog from './ExportPatientDialog';
import PatientDialog from './PatientDialog';
import DeletePatientDialog from './DeletePatientDialog';
import './Patients.css';

export default function PatientsPage({ desktopSave = false, allowExport = false, onOpenNote }) {
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState(''); const [items, setItems] = useState([]); const [cursor, setCursor] = useState(null);
  const [patient, setPatient] = useState(null); const [visits, setVisits] = useState([]); const [visitCursor, setVisitCursor] = useState(null);
  const [selected, setSelected] = useState(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false); const [profileDraft, setProfileDraft] = useState(null); const [diagnosis, setDiagnosis] = useState(null); const [exportOpen, setExportOpen] = useState(false);
  useEffect(() => {
    let active = true; const timer = setTimeout(() => {
      setBusy(true); patientRequest('listPatients', { search, limit: 50 }).then(result => { if (active) { setItems(result.items); setCursor(result.nextCursor); setMessage(''); } }).catch(error => { if (active) setMessage(error.message); }).finally(() => { if (active) setBusy(false); });
    }, 200); return () => { active = false; clearTimeout(timer); };
  }, [search]);
  const open = async value => { if (value.deletionPending) { setPatient(value); setDeleting(true); return; } setBusy(true); setMessage(''); try { const result = await patientRequest('getPatientVisits', { patientId: value.patientId }); setPatient(result.patient); setVisits(result.notes); const details = await patientRequest('getPatient', { patientId: value.patientId, includeDiagnosis: true }); setDiagnosis(details.diagnosis); setVisitCursor(result.nextCursor); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const more = async () => { setBusy(true); try {
    if (patient) { const result = await patientRequest('getPatientVisits', { patientId: patient.patientId, cursor: visitCursor }); setVisits(old => [...old, ...result.notes]); setVisitCursor(result.nextCursor); }
    else { const result = await patientRequest('listPatients', { search, cursor, limit: 50 }); setItems(old => [...old, ...result.items]); setCursor(result.nextCursor); }
  } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const saveProfile = async event => { event.preventDefault(); setBusy(true); try { const result = await patientRequest('updatePatient', { patientId: patient.patientId, name: profileDraft.name, sex: profileDraft.sex, dateOfBirth: profileDraft.dateOfBirth || null, dateOfInjury: profileDraft.dateOfInjury || null }); setPatient(result.patient); setEditingProfile(false); setMessage('Patient profile saved. Existing clinical notes are unchanged.'); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const add = async () => { if (!search.trim()) return; setBusy(true); try { const result = await patientRequest('createPatient', { patientId: crypto.randomUUID(), name: search.trim() }); await open(result.patient); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const openVisit = async timestamp => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await patientRequest('getSavedNote', { timestamp });
      if (mounted.current) await onOpenNote?.(result.note);
    } catch (error) { if (mounted.current) setMessage(error.message); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <main className="patients-page" aria-busy={busy}><div className="patient-toolbar patient-page-heading"><h1>{patient ? patient.name : 'Patients'}</h1>{patient && <button onClick={() => { setPatient(null); setEditingProfile(false); setExportOpen(false); }}>All patients</button>}</div>
    {message && <p role="alert">{message}</p>}{busy && <p role="status">Working…</p>}
    {!patient ? <><label>Search patients<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
      {search.trim() && <button disabled={busy} onClick={add}>Create “{search.trim()}”</button>}
      <ul className="patient-directory">{items.map(item => <li key={item.patientId}><button disabled={busy} onClick={() => open(item)}><strong>{item.name}</strong><small>{item.visitCount} saved visits · {item.lastVisitDate || 'No dated visit'}</small></button></li>)}</ul>
      {!busy && !items.length && <p>No patients match this search.</p>}{cursor && <button disabled={busy} onClick={more}>More patients</button>}
    </> : <>
      <section className="patient-card" aria-labelledby="patient-details-title"><div className="patient-toolbar"><h2 id="patient-details-title">Patient details</h2><div className="patient-actions"><button disabled={busy} onClick={() => { setProfileDraft({ ...patient }); setEditingProfile(true); }}>Edit patient profile</button><button disabled={busy} onClick={() => setDeleting(true)}>Delete patient</button>{allowExport && <button disabled={busy} onClick={() => setExportOpen(true)}>Export patient</button>}</div></div>
      <dl className="patient-profile-details"><div><dt>Date of birth</dt><dd>{patient.dateOfBirth || 'Not set'}</dd></div><div><dt>Sex</dt><dd>{patient.sex || 'Not set'}</dd></div><div><dt>Date of injury</dt><dd>{patient.dateOfInjury || 'Not set'}</dd></div></dl></section>
      {deleting && <DeletePatientDialog patient={patient} onClose={() => setDeleting(false)} onDeleted={patientId => {
        setDeleting(false); setPatient(null); setVisits([]); setDiagnosis(null);
        setItems(old => old.filter(item => item.patientId !== patientId));
        setMessage('Patient and linked notes/transcripts deleted.');
        window.dispatchEvent(new CustomEvent('patient-deleted', { detail: { patientId } }));
      }} />}
      {editingProfile && <PatientDialog title="Edit patient profile" busy={busy} onClose={() => setEditingProfile(false)}><form onSubmit={saveProfile}>
        {message && <p role="alert">{message}</p>}
        <div className="patient-field-grid"><label>Patient name<input required value={profileDraft.name} onChange={e => setProfileDraft({ ...profileDraft, name: e.target.value })} /></label>
        <label>Date of birth<input type="date" max={localDate()} value={profileDraft.dateOfBirth || ''} onChange={e => setProfileDraft({ ...profileDraft, dateOfBirth: e.target.value })} /></label>
        <label>Sex<select value={profileDraft.sex || ''} onChange={e => setProfileDraft({ ...profileDraft, sex: e.target.value || null })}><option value="">Not set</option>{['female', 'male', 'intersex', 'unknown', 'other'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Date of injury<input type="date" max={localDate()} value={profileDraft.dateOfInjury || ''} onChange={e => setProfileDraft({ ...profileDraft, dateOfInjury: e.target.value })} /></label></div>
        <p>These details apply to the patient profile. Existing clinical notes remain as saved.</p>
        <div className="patient-actions"><button disabled={busy} type="submit">Save profile</button><button type="button" disabled={busy} onClick={() => setEditingProfile(false)}>Cancel</button></div>
      </form></PatientDialog>}
      <aside className={`patient-card patient-diagnosis-summary${diagnosis?.reviewRequired ? ' patient-confirmation' : ''}`}><h2>Diagnoses</h2>
        {diagnosis?.reviewRequired ? <p>Open the latest note to review its diagnosis changes.</p> : diagnosis?.state ? <>{diagnosis.state.icdCodes.some(item => item.status !== 'resolved') ? <ul>{diagnosis.state.icdCodes.filter(item => item.status !== 'resolved').map(item => <li key={item.code}>{item.code} — {item.description}</li>)}</ul> : <p>No active diagnosis codes.</p>}<p>From the visit on {diagnosis.sourceDateOfService}.</p></> : <p>No saved diagnosis codes yet.</p>}
        {diagnosis?.sourceTimestamp && <button type="button" disabled={busy} onClick={() => openVisit(diagnosis.sourceTimestamp)}>Open source note</button>}
      </aside>
      {exportOpen && <ExportPatientDialog patient={patient} desktopSave={desktopSave} onClose={() => setExportOpen(false)} />}
      <h2>Visits</h2><ul className="patient-directory">{visits.map(visit => <li key={visit.timestamp}><button disabled={busy} onClick={() => openVisit(visit.timestamp)}><span><strong>{visit.visitLabel || visit.noteLabel || 'Untitled visit'}</strong><small>{visit.dateOfService || 'Date not confirmed'} · {visit.visitType || 'Type not set'}</small></span><small>{visit.needsContextReview || visit.diagnosisReviewRequired ? 'Review needed' : visit.generationStatus === 'PENDING' ? 'Pending' : 'Open in clipboard'}</small></button><button className="visit-details-link" disabled={busy} aria-label={`Visit details for ${visit.visitLabel || visit.noteLabel || visit.dateOfService || 'visit'}`} onClick={() => setSelected(visit.timestamp)}>Visit details</button></li>)}</ul>
      {!visits.length && <p>No visits have been assigned to this patient yet.</p>}{visitCursor && <button disabled={busy} onClick={more}>More visits</button>}
    </>}
    {selected && <VisitDetailsDialog timestamp={selected} onClose={() => { setSelected(null); if (patient) open(patient); }}
      onOpenNote={openVisit} onSaved={saved => setVisits(old => old.map(note => note.timestamp === saved.timestamp ? saved : note))} />}
  </main>;
}
