import React, { useEffect, useRef, useState } from 'react';
import { DIAGNOSIS_STATUSES, diagnosisStatusLabel } from './diagnosisCodes';
import './Patients.css';

export default function ClipboardSaveReview({ review, busy, onConfirm, onCancel }) {
  const [value, setValue] = useState(review);
  const heading = useRef(null);
  useEffect(() => { setValue(review); heading.current?.focus(); }, [review]);
  const invalid = value.kind === 'local' && value.icdCodes?.some(item => !DIAGNOSIS_STATUSES.includes(item.status) || !item.description.trim());
  return <section className="clipboard-save-review" aria-labelledby="clipboard-review-heading" aria-busy={busy}>
    <h3 id="clipboard-review-heading" tabIndex={-1} ref={heading}>{value.icdCodes ? 'Confirm diagnosis changes' : 'Confirm visit review'}</h3>
    {value.icdCodes && <>
      <p>Save this diagnosis list with your edited note.</p>
      {value.icdCodes.length ? <ul>{value.icdCodes.map((item, index) => <li key={item.code}>
        <span><strong>{item.code}</strong> — {review.kind === 'local' && !review.icdCodes[index].description
          ? <label>Description<input aria-label={`Description for ${item.code}`} disabled={busy} value={item.description} onChange={event => setValue(current => ({ ...current, icdCodes: current.icdCodes.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry) }))} /></label>
          : item.description}</span>
        {value.kind === 'local' ? <select aria-label={`Status for ${item.code}`} disabled={busy} value={item.status} onChange={event => setValue(current => ({ ...current, icdCodes: current.icdCodes.map((entry, i) => i === index ? { ...entry, status: event.target.value } : entry) }))}>
          <option value="">Choose status</option>{DIAGNOSIS_STATUSES.map(status => <option key={status} value={status}>{diagnosisStatusLabel(status)}</option>)}
        </select> : <small>{diagnosisStatusLabel(item.status)}</small>}
      </li>)}</ul> : <p><strong>{value.kind === 'server' && !value.establishesSet ? 'Diagnosis state will remain unknown.' : 'No coded diagnoses. Confirming will save an empty diagnosis list.'}</strong></p>}
      {value.removed?.length > 0 && <p>Removed from this visit’s list: {value.removed.map(item => item.code).join(', ')}.</p>}
    </>}
    {value.needsContextReview && <label className="patient-check"><input type="checkbox" disabled={busy} checked={Boolean(value.contextConfirmed)} onChange={event => setValue(current => ({ ...current, contextConfirmed: event.target.checked }))} /> I reviewed this note against its patient and visit details.</label>}
    <p className="patient-help">Later saved visits will stay unchanged.</p>
    <div className="patient-actions"><button type="button" disabled={busy || invalid || (value.needsContextReview && !value.contextConfirmed)} onClick={() => onConfirm(value)}>{busy ? 'Saving…' : 'Confirm and save'}</button><button type="button" disabled={busy} onClick={onCancel}>Keep editing</button></div>
  </section>;
}
