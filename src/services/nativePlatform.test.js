import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';
import { writeClipboardText } from './nativePlatform';
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: jest.fn() } }));
jest.mock('@capacitor/clipboard', () => ({ Clipboard: { write: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn() } }); });
test('native copies use the system clipboard without browser access', async () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  await writeClipboardText('Synthetic note');
  expect(Clipboard.write).toHaveBeenCalledWith({ string: 'Synthetic note' });
  expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
});
test('web copy keeps the browser contract and propagates failures', async () => {
  Capacitor.isNativePlatform.mockReturnValue(false);
  navigator.clipboard.writeText.mockRejectedValue(new Error('unavailable'));
  await expect(writeClipboardText('Synthetic note')).rejects.toThrow('unavailable');
  expect(Clipboard.write).not.toHaveBeenCalled();
});
