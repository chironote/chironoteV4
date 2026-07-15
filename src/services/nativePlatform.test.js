import { App as CapacitorApp } from '@capacitor/app';
import { Clipboard as CapacitorClipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import {
  addNativeAppStateListener,
  isNativePlatform,
  writeClipboardText
} from './nativePlatform';

jest.mock('@capacitor/app', () => ({
  App: {
    addListener: jest.fn()
  }
}));

jest.mock('@capacitor/clipboard', () => ({
  Clipboard: {
    write: jest.fn()
  }
}));

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn()
  }
}));

describe('nativePlatform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: jest.fn()
      }
    });
  });

  test('reports the Capacitor platform state', () => {
    Capacitor.isNativePlatform.mockReturnValue(true);

    expect(isNativePlatform()).toBe(true);
  });

  test('uses the browser clipboard outside Capacitor', async () => {
    Capacitor.isNativePlatform.mockReturnValue(false);

    await writeClipboardText('browser text');

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('browser text');
    expect(CapacitorClipboard.write).not.toHaveBeenCalled();
  });

  test('uses the native clipboard inside Capacitor', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);

    await writeClipboardText('native text');

    expect(CapacitorClipboard.write).toHaveBeenCalledWith({ string: 'native text' });
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  test('only subscribes to native app state inside Capacitor', async () => {
    const listener = jest.fn();
    const handle = { remove: jest.fn() };
    CapacitorApp.addListener.mockResolvedValue(handle);

    Capacitor.isNativePlatform.mockReturnValue(false);
    await expect(addNativeAppStateListener(listener)).resolves.toBeNull();

    Capacitor.isNativePlatform.mockReturnValue(true);
    await expect(addNativeAppStateListener(listener)).resolves.toBe(handle);
    expect(CapacitorApp.addListener).toHaveBeenCalledWith('appStateChange', listener);
  });
});
