import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ProductDialog.css';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function ProductDialog({
  isOpen,
  title,
  description,
  children,
  onRequestClose,
  initialFocusRef,
  returnFocusRef,
  dismissalDisabled = false,
  size = 'standard'
}) {
  const generatedId = useId();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = `product-dialog-title-${generatedId}`;
  const descriptionId = description ? `product-dialog-description-${generatedId}` : undefined;

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const requestedReturnFocus = returnFocusRef?.current;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const preferredTarget = initialFocusRef?.current;
      const fallbackTarget = dialogRef.current?.querySelector(FOCUSABLE_SELECTOR);
      (preferredTarget || fallbackTarget || dialogRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!dismissalDisabled) {
          event.preventDefault();
          onRequestClose();
        }
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      const previousFocus = requestedReturnFocus || previousFocusRef.current;
      if (previousFocus && document.contains(previousFocus)) {
        window.setTimeout(() => previousFocus.focus(), 0);
      }
    };
  }, [dismissalDisabled, initialFocusRef, isOpen, onRequestClose, returnFocusRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="product-dialog-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !dismissalDisabled) onRequestClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`product-dialog product-dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex="-1"
      >
        <header className="product-dialog__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            type="button"
            className="product-dialog__close"
            onClick={onRequestClose}
            disabled={dismissalDisabled}
            aria-label={dismissalDisabled ? 'Close unavailable while request is in progress' : 'Close dialog'}
          >
            <span className="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
        </header>
        <div className="product-dialog__body">{children}</div>
      </section>
    </div>,
    document.body
  );
}

export default ProductDialog;
