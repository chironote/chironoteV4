import React, { useEffect, useState } from 'react';
import { patientRequest } from '../../services/patientNotes';
import PatientDialog from './PatientDialog';
import './Patients.css';
export function SignatureDialog({ onClose, onSaved }) {
  const [value, setValue] = useState({ name: '', npi: '' }); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(true);
  useEffect(() => { let active = true; patientRequest('getSignature').then(result => { if (active) setValue({ name: result.name, npi: result.npi }); }).catch(error => { if (active) setMessage(error.message); }).finally(() => { if (active) setBusy(false); }); return () => { active = false; }; }, []);
  const save = async event => { event.preventDefault(); setBusy(true); setMessage(''); try { const saved = await patientRequest('saveSignature', value); onSaved?.(saved); onClose(); } catch (error) { setMessage(error.message); } finally { setBusy(false); } };
  return <PatientDialog title="Configure Signature" onClose={onClose} busy={busy}><p>Your saved name and NPI appear beneath each exported visit.</p>
    <form onSubmit={save}><label>Name<input required disabled={busy} autoComplete="name" maxLength={200} value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} /></label>
      <label>NPI<input required disabled={busy} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={value.npi} onChange={e => setValue({ ...value, npi: e.target.value })} /></label>
      <div className="patient-actions"><button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save'}</button><button disabled={busy} type="button" onClick={onClose}>Cancel</button></div></form>{message && <p role="alert">{message}</p>}
  </PatientDialog>;
}

export default function SignatureSettings() {
  const [open, setOpen] = useState(false); const [message, setMessage] = useState('');
  return <section className="patient-signature"><button type="button" onClick={() => setOpen(true)}>Configure Signature</button>{message && <p role="status">{message}</p>}{open && <SignatureDialog onClose={() => setOpen(false)} onSaved={() => setMessage('Signature saved.')} />}</section>;
}
