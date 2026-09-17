import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import WorkflowDemo from './WorkflowDemo';

describe('WorkflowDemo', () => {
  let container;
  let root;

  beforeEach(() => {
    jest.useFakeTimers();
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<WorkflowDemo />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  const click = (selector) => act(() => container.querySelector(selector).click());

  test('teaches the three-step workflow with real store destinations', () => {
    expect(container.querySelectorAll('.workflow-demo__desktop-nav button')).toHaveLength(3);
    expect(container.querySelector('[aria-label="Show previous step"]')).toBeNull();
    expect(container.textContent).toContain('Record the visit');
    expect(container.textContent).toContain('Click New Note, then Start Recording');

    click('[aria-label="Show next step"]');
    expect(container.querySelector('[aria-label="Show previous step"]')).not.toBeNull();
    expect(container.textContent).toContain('Review the SOAP note');
    expect(container.textContent).not.toContain('Make any final changes yourself or with Smart Editor.');

    click('[aria-label="Show next step"]');
    expect(container.textContent).toContain('Move it into your EHR');
    expect(container.textContent).toContain('Copy the full SOAP note');
    expect(container.textContent).not.toContain('Step 3');
    expect(container.querySelector('[aria-label="Download ChiroNote on the App Store"]').href).toContain('id6756679857');
    expect(container.querySelector('[aria-label="Get ChiroNote on Google Play"]').href).toContain('com.chironote.app');
  });

  test('advances automatically and can be paused', () => {
    act(() => jest.advanceTimersByTime(7000));
    expect(container.textContent).toContain('Review the SOAP note');

    click('.workflow-demo__pause');
    act(() => jest.advanceTimersByTime(14000));
    expect(container.textContent).toContain('Review the SOAP note');
    expect(container.querySelector('.workflow-demo__pause').getAttribute('aria-pressed')).toBe('true');
  });

  test('moves between steps with a horizontal swipe', () => {
    const stage = container.querySelector('.workflow-demo__stage');
    const start = new Event('touchstart', { bubbles: true });
    Object.defineProperty(start, 'touches', { value: [{ clientX: 260, clientY: 100 }] });
    const end = new Event('touchend', { bubbles: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 140, clientY: 108 }] });

    act(() => {
      stage.dispatchEvent(start);
      stage.dispatchEvent(end);
    });

    expect(container.textContent).toContain('Review the SOAP note');
  });
});
