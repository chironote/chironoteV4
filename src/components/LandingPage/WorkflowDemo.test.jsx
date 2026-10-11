import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import WorkflowDemo from './WorkflowDemo';

describe('WorkflowDemo', () => {
  let container;
  let root;
  let intersectionCallback;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    window.IntersectionObserver = jest.fn((callback) => {
      intersectionCallback = callback;
      return { observe: jest.fn(), disconnect: jest.fn() };
    });
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
    jest.restoreAllMocks();
    delete window.IntersectionObserver;
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
    expect(container.textContent).toContain('drag the finished note from Recent Notes');
    expect(container.textContent).not.toContain('Step 3');
    expect(container.querySelector('[aria-label="Download ChiroNote on the App Store"]').href).toContain('id6756679857');
    expect(container.querySelector('[aria-label="Get ChiroNote on Google Play"]').href).toContain('com.chironote.app');
  });

  test('starts advancing only after it enters the viewport and can be paused', () => {
    act(() => jest.advanceTimersByTime(9500));
    expect(container.textContent).toContain('Record the visit');

    act(() => intersectionCallback([{ isIntersecting: true }]));
    act(() => jest.advanceTimersByTime(9499));
    expect(container.textContent).toContain('Record the visit');
    act(() => jest.advanceTimersByTime(1));
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

  test('starts each selected video from the beginning', () => {
    const videos = container.querySelectorAll('video');
    act(() => intersectionCallback([{ isIntersecting: true }]));
    expect(videos[0].play).toHaveBeenCalled();

    videos[1].currentTime = 4;
    click('[aria-label="Show next step"]');
    expect(videos[0].pause).toHaveBeenCalled();
    expect(videos[1].currentTime).toBe(0);
    expect(videos[1].play).toHaveBeenCalled();

    videos[2].currentTime = 5;
    click('[aria-label="Show next step"]');
    expect(videos[1].pause).toHaveBeenCalled();
    expect(videos[2].currentTime).toBe(0);
    expect(videos[2].play).toHaveBeenCalled();
  });
});
