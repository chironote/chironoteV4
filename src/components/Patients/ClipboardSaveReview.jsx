import React, { useEffect, useRef, useState } from 'react';
import './Patients.css';

export default function ClipboardSaveReview({ review, busy, onConfirm, onCancel }) {
  const [value, setValue] = useState(review);
  const heading = useRef(null);
  useEffect(() => { setValue(review); heading.current?.focus(); }, [review]);
  const invalid = value.kind === 'local' && value.icdCodes?.some(item => !item.description.trim());
  const visibleCodes = value.icdCodes?.filter(item => item.status !== 'resolved');
  return <section className="clipboard-save-review" aria-labelledby="clipboard-review-heading" aria-busy={busy}>
    <h3 id="clipboard-review-heading" tabIndex={-1} ref={heading}>{value.icdCodes ? 'Confirm diagnosis changes' : 'Confirm visit review'}</h3>
    {value.icdCodes && <>
      <p>Save this diagnosis list with your edited note.</p>
      {visibleCodes.length ? <ul>{visibleCodes.map(item => <li key={item.code}>
        <span><strong>{item.code}</strong> — {review.kind === 'local' && !review.icdCodes.find(entry => entry.code === item.code).description
          ? <label>Description<input aria-label={`Description for ${item.code}`} disabled={busy} value={item.description} onChange={event => setValue(current => ({ ...current, icdCodes: current.icdCodes.map(entry => entry.code === item.code ? { ...entry, description: event.target.value } : entry) }))} /></label>
          : item.description}</span>
      </li>)}</ul> : <p><strong>{value.kind === 'server' && !value.establishesSet ? 'No diagnosis codes confirmed.' : 'No active diagnosis codes in this list.'}</strong></p>}
      {value.removed?.length > 0 && <p>Removed from this visit’s list: {value.removed.map(item => item.code).join(', ')}.</p>}
    </>}
    {value.needsContextReview && <label className="patient-check"><input type="checkbox" disabled={busy} checked={Boolean(value.contextConfirmed)} onChange={event => setValue(current => ({ ...current, contextConfirmed: event.target.checked }))} /> I reviewed this note against its patient and visit details.</label>}
    <p className="patient-help">Future notes will use the latest visit’s saved diagnoses. Other saved notes stay unchanged.</p>
    <div className="patient-actions"><button type="button" disabled={busy || invalid || (value.needsContextReview && !value.contextConfirmed)} onClick={() => onConfirm(value)}>{busy ? 'Saving…' : 'Confirm and save'}</button><button type="button" disabled={busy} onClick={onCancel}>Keep editing</button></div>
  </section>;
}
