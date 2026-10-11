import { renderHook, act } from '@testing-library/react';
import useDesktopSave from './useDesktopSave';
import { isNativePlatform } from '../../services/nativePlatform';
jest.mock('../../services/nativePlatform', () => ({ isNativePlatform: jest.fn() }));
let media, change;
beforeEach(() => {
  media = { matches: false, addEventListener: jest.fn((_, fn) => { change = fn; }), removeEventListener: jest.fn() };
  window.matchMedia = jest.fn(() => media);
});
test('native touch phones retain persistent Save and draft guards', () => {
  isNativePlatform.mockReturnValue(true);
  const { result } = renderHook(useDesktopSave);
  expect(result.current).toBe(true);
});
test('mobile web remains local edit while fine pointer desktop responds to viewport changes', () => {
  isNativePlatform.mockReturnValue(false);
  const { result, unmount } = renderHook(useDesktopSave);
  expect(result.current).toBe(false);
  act(() => { media.matches = true; change(); });
  expect(result.current).toBe(true);
  unmount(); expect(media.removeEventListener).toHaveBeenCalledWith('change', change);
});
