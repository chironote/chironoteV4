import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import usePhoneLayout, { isPhoneLayout } from './usePhoneLayout';

global.IS_REACT_ACT_ENVIRONMENT = true;

test.each([
  [375, 812, 375, 812, true],
  [812, 375, 375, 812, true],
  [1024, 350, 768, 1024, false],
  [1440, 400, 1920, 1080, false],
  [375, 812, 0, 0, true],
  [1024, 768, 0, 0, false],
])('phone detection for viewport %s x %s and screen %s x %s', (innerWidth, innerHeight, width, height, expected) => {
  expect(isPhoneLayout({ innerWidth, innerHeight, screen: { width, height } })).toBe(expected);
});

test('rotation and resize update phone state and listeners clean up', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const width = window.innerWidth;
  const screenWidth = Object.getOwnPropertyDescriptor(window.screen, 'width');
  const screenHeight = Object.getOwnPropertyDescriptor(window.screen, 'height');
  Object.defineProperty(window.screen, 'width', { configurable: true, value: 375 });
  Object.defineProperty(window.screen, 'height', { configurable: true, value: 812 });
  const Harness = () => <span>{String(usePhoneLayout())}</span>;
  act(() => root.render(<Harness />));
  expect(container.textContent).toBe('true');
  act(() => { window.innerWidth = 812; window.dispatchEvent(new Event('orientationchange')); });
  expect(container.textContent).toBe('true');
  Object.defineProperty(window.screen, 'width', { configurable: true, value: 1024 });
  Object.defineProperty(window.screen, 'height', { configurable: true, value: 768 });
  act(() => { window.innerWidth = 1024; window.dispatchEvent(new Event('resize')); });
  expect(container.textContent).toBe('false');
  const remove = jest.spyOn(window, 'removeEventListener');
  act(() => root.unmount());
  expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
  expect(remove).toHaveBeenCalledWith('orientationchange', expect.any(Function));
  remove.mockRestore(); window.innerWidth = width;
  if (screenWidth) Object.defineProperty(window.screen, 'width', screenWidth); else delete window.screen.width;
  if (screenHeight) Object.defineProperty(window.screen, 'height', screenHeight); else delete window.screen.height;
});
