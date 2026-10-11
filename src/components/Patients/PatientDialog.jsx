import React, { useEffect, useRef } from 'react';
import '../Dialog/ProductDialog.css';

export default function PatientDialog({ title, children, onClose, busy = false, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  const keyDown = event => {
    if (event.key === 'Escape') { event.stopPropagation(); if (!busy) onClose(); return; }
    if (event.key !== 'Tab') return;
    event.stopPropagation();
    const elements = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length);
    const first = elements[0]; const last = elements.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
  };
  return <div className="patient-modal-backdrop"><section className={`patient-modal patient-form-dialog ${className}`} role="dialog" aria-modal="true" aria-label={title} aria-busy={busy} tabIndex={-1} ref={ref} onKeyDown={keyDown}>
    <header className="product-dialog__header"><h2>{title}</h2><button className="product-dialog__close" type="button" disabled={busy} onClick={onClose} aria-label={`Close ${title}`}><span className="material-symbols-rounded" aria-hidden="true">close</span></button></header>
    <div className="product-dialog__body patient-form">{children}</div>
  </section></div>;
}
