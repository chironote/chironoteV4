import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import MobileHistoryToggle from './MobileHistoryToggle';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('MobileHistoryToggle', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('uses an enabled button with an accessible open label when collapsed', () => {
    const onToggle = jest.fn();
    act(() => root.render(<MobileHistoryToggle isCollapsed isDisabled={false} onToggle={onToggle} />));
    const button = container.querySelector('button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Open recent notes');
    expect(button.disabled).toBe(false);
    act(() => button.click());
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('uses a disabled button with an accessible close label when expanded', () => {
    act(() => root.render(<MobileHistoryToggle isCollapsed={false} isDisabled onToggle={() => {}} />));
    const button = container.querySelector('button');
    expect(button.getAttribute('aria-label')).toBe('Close recent notes');
    expect(button.disabled).toBe(true);
  });
});
