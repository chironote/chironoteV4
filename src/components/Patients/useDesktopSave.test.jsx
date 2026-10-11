import { renderHook } from '@testing-library/react';
import { isNativePlatform } from '../../services/nativePlatform';
import useDesktopSave from './useDesktopSave';
jest.mock('../../services/nativePlatform', () => ({ isNativePlatform: jest.fn() }));
test.each([[true, false, true], [false, false, false], [false, true, true]])('native=%s desktop=%s enables Save=%s', (native, desktop, expected) => {
  isNativePlatform.mockReturnValue(native);
  window.matchMedia = jest.fn(() => ({ matches: desktop, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  const { result } = renderHook(useDesktopSave);
  expect(result.current).toBe(expected);
});
