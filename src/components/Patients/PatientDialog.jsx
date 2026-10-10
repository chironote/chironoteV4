import React, { useEffect, useRef } from 'react';

export default function PatientDialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const keyDown = event => {
    if (event.key === 'Escape' && !busy) { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const elements = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length);
    const first = elements[0]; const last = elements.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
  };
  return <div className="patient-modal-backdrop"><section className="patient-modal" role="dialog" aria-modal="true" aria-label={title} aria-busy={busy} tabIndex={-1} ref={ref} onKeyDown={keyDown}>
    <div className="patient-toolbar"><h2>{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label={`Close ${title}`}>Close</button></div>{children}
  </section></div>;
}
