import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const writeClipboardText = text => isNativePlatform()
  ? Clipboard.write({ string: text })
  : navigator.clipboard.writeText(text);
