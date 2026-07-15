import { App as CapacitorApp } from '@capacitor/app';
import { Clipboard as CapacitorClipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export const writeClipboardText = async (text) => {
  if (isNativePlatform()) {
    await CapacitorClipboard.write({ string: text });
    return;
  }

  await navigator.clipboard.writeText(text);
};

export const addNativeAppStateListener = async (listener) => {
  if (!isNativePlatform()) {
    return null;
  }

  return CapacitorApp.addListener('appStateChange', listener);
};
