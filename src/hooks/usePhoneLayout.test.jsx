import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import usePhoneLayout, { isPhoneLayout } from './usePhoneLayout';

global.IS_REACT_ACT_ENVIRONMENT = true;

test.each([
  [375, 812, 375, 812, true],
  [812, 375, 375, 812, true],
  [1024, 768, 768, 1024, false],
  [1200, 350, 1920, 1080, false],
  [375, 812, 0, 0, true],
  [812, 375, 0, 0, false],
  [812, 375, NaN, 375, false],
])('viewport %sx%s on screen %sx%s yields phone=%s', (width, height, screenWidth, screenHeight, expected) => {
  expect(isPhoneLayout({ innerWidth: width, innerHeight: height, screen: { width: screenWidth, height: screenHeight } })).toBe(expected);
});

test('resize and orientation changes update phone state without using viewport height', () => {
  const originalWidth = window.innerWidth;
  const widthDescriptor = Object.getOwnPropertyDescriptor(window.screen, 'width');
  const heightDescriptor = Object.getOwnPropertyDescriptor(window.screen, 'height');
  Object.defineProperty(window.screen, 'width', { configurable: true, value: 1024 });
  Object.defineProperty(window.screen, 'height', { configurable: true, value: 768 });
  window.innerWidth = 1024;
  const container = document.createElement('div');
  const root = createRoot(container);
  function Probe() { return <span>{String(usePhoneLayout())}</span>; }
  try {
    act(() => root.render(<Probe />));
    expect(container.textContent).toBe('false');
    act(() => { window.innerWidth = 375; window.dispatchEvent(new Event('resize')); });
    expect(container.textContent).toBe('true');
    act(() => {
      window.innerWidth = 812;
      Object.defineProperty(window.screen, 'width', { configurable: true, value: 375 });
      window.dispatchEvent(new Event('orientationchange'));
    });
    expect(container.textContent).toBe('true');
  } finally {
    act(() => root.unmount());
    window.innerWidth = originalWidth;
    if (widthDescriptor) Object.defineProperty(window.screen, 'width', widthDescriptor); else delete window.screen.width;
    if (heightDescriptor) Object.defineProperty(window.screen, 'height', heightDescriptor); else delete window.screen.height;
  }
});
