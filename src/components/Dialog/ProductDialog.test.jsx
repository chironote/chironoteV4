import React, { act, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ProductDialog from './ProductDialog';

global.IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ onClose }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  return <>
    <button ref={triggerRef} onClick={() => setOpen(true)}>Open dialog</button>
    <ProductDialog isOpen={open} title="Test dialog" onRequestClose={() => { setOpen(false); onClose(); }} returnFocusRef={triggerRef}>
      <button>First</button><button>Last</button>
    </ProductDialog>
  </>;
}

describe('ProductDialog', () => {
  let container;
  let root;
  beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
  afterEach(() => { act(() => root.unmount()); container.remove(); document.body.innerHTML = ''; jest.useRealTimers(); });

  test('traps focus, closes on Escape, and restores focus to the trigger', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    act(() => root.render(<Harness onClose={onClose} />));
    const trigger = container.querySelector('button');
    act(() => trigger.click());
    act(() => jest.runOnlyPendingTimers());
    expect(document.activeElement.getAttribute('aria-label')).toBe('Close dialog');

    const last = Array.from(document.querySelectorAll('[role="dialog"] button')).at(-1);
    last.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement.getAttribute('aria-label')).toBe('Close dialog');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    act(() => jest.runOnlyPendingTimers());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger);
  });
});
