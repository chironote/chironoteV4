import React, { useEffect, useRef, useState } from 'react';
import PatientDialog from './PatientDialog';
import { registerDraftGuard } from './draftNavigation';

export default function useDraftGuard({ dirty, save, busy = false, discard = () => {} }) {
  const [open, setOpen] = useState(false);
  const pending = useRef(null);
  const latest = useRef({ dirty, save, discard, busy });
  latest.current = { dirty, save, discard, busy };
  const finish = allowed => {
    const resolve = pending.current; pending.current = null; setOpen(false); resolve?.(allowed);
  };
  const confirm = () => {
    if (latest.current.busy) return Promise.resolve(false);
    if (!latest.current.dirty) return Promise.resolve(true);
    if (pending.current) return Promise.resolve(false);
    setOpen(true);
    return new Promise(resolve => { pending.current = resolve; });
  };
  useEffect(() => {
    const unregister = registerDraftGuard({ dirty: () => latest.current.dirty || latest.current.busy, confirm });
    return () => { unregister(); pending.current?.(false); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const saveAndContinue = async () => {
    setOpen(false);
    // A failed save or pending diagnosis confirmation leaves the editor open.
    // A later successful confirm/save calls saved() to finish this transition.
    const result = await latest.current.save();
    if (result === true) finish(true);
    else if (result !== 'confirmation') finish(false);
  };
  return {
    confirm,
    saved: () => finish(true),
    cancel: () => finish(false),
    dialog: open && <PatientDialog title="Unsaved note" busy={busy} onClose={() => finish(false)}>
      <p>Save this draft before continuing?</p>
      <div className="patient-actions">
        <button disabled={busy} onClick={saveAndContinue}>Save and continue</button>
        <button disabled={busy} onClick={() => { latest.current.discard(); finish(true); }}>Discard changes</button>
        <button disabled={busy} onClick={() => finish(false)}>Keep editing</button>
      </div>
    </PatientDialog>,
  };
}
