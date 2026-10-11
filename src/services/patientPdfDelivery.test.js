import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNativePlatform } from './nativePlatform';
import { cleanupPatientPdfCache, deliverPatientPdf } from './patientPdfDelivery';

jest.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Filesystem: { readdir: jest.fn(), writeFile: jest.fn(), deleteFile: jest.fn() } }));
jest.mock('@capacitor/share', () => ({ Share: { canShare: jest.fn(), share: jest.fn() } }));
jest.mock('./nativePlatform', () => ({ isNativePlatform: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks();
  isNativePlatform.mockReturnValue(true);
  Filesystem.readdir.mockResolvedValue({ files: [] });
  Filesystem.writeFile.mockResolvedValue({ uri: 'file:///cache/generic.pdf' });
  Filesystem.deleteFile.mockResolvedValue();
  Share.canShare.mockResolvedValue({ value: true }); Share.share.mockResolvedValue({});
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'synthetic-id' } });
});
afterEach(async () => { jest.runOnlyPendingTimers(); await Promise.resolve(); jest.useRealTimers(); });
const pdf = () => new Blob(['%PDF-1.7 synthetic'], { type: 'application/pdf' });

test('shares a generic cache URI with base64 data and expires only after receiver grace time', async () => {
  const result = await deliverPatientPdf(pdf());
  expect(result).toEqual({ native: true, cancelled: false });
  expect(Filesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({ directory: 'CACHE', recursive: true, path: expect.stringMatching(/^patient-pdf-exports\/Patient-notes-\d+-synthetic-id.pdf$/), data: btoa('%PDF-1.7 synthetic') }));
  expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///cache/generic.pdf'] }));
  expect(Filesystem.deleteFile).not.toHaveBeenCalled();
  jest.advanceTimersByTime(10 * 60 * 1000);
  expect(Filesystem.deleteFile).toHaveBeenCalledWith(expect.objectContaining({ path: Filesystem.writeFile.mock.calls[0][0].path }));
});
test('cancellation removes the cache and is not a failure', async () => {
  Share.share.mockRejectedValue(new Error('Share canceled'));
  expect(await deliverPatientPdf(pdf())).toEqual({ native: true, cancelled: true });
  expect(Filesystem.deleteFile).toHaveBeenCalledTimes(1);
});
test('a second export cannot overwrite or interrupt an open native share', async () => {
  let finish;
  let opened;
  const sharingStarted = new Promise(resolve => { opened = resolve; });
  Share.share.mockImplementation(() => { opened(); return new Promise(resolve => { finish = resolve; }); });
  const first = deliverPatientPdf(pdf());
  await sharingStarted;
  await expect(deliverPatientPdf(pdf())).rejects.toThrow('Finish sharing the current PDF');
  expect(Filesystem.writeFile).toHaveBeenCalledTimes(1);
  finish({});
  await first;
});
test('share errors remove the file and expose only a generic message', async () => {
  Share.share.mockRejectedValue(new Error('private provider detail'));
  await expect(deliverPatientPdf(pdf())).rejects.toThrow('The PDF could not be shared. Please try again.');
  expect(Filesystem.deleteFile).toHaveBeenCalledTimes(1);
});
test('cleanup removes only expired export files, leaving fresh and unrelated files', async () => {
  const old = `Patient-notes-${Date.now() - 600001}-old-id.pdf`;
  Filesystem.readdir.mockResolvedValue({ files: [{ name: old }, { name: `Patient-notes-${Date.now()}-new-id.pdf` }, { name: 'unrelated.pdf' }] });
  await cleanupPatientPdfCache();
  expect(Filesystem.deleteFile).toHaveBeenCalledTimes(1);
  expect(Filesystem.deleteFile).toHaveBeenCalledWith({ path: `patient-pdf-exports/${old}`, directory: 'CACHE' });
});
test('mobile web retains a temporary download anchor and never writes native cache', async () => {
  isNativePlatform.mockReturnValue(false);
  URL.createObjectURL = jest.fn(() => 'blob:synthetic'); URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  expect(await deliverPatientPdf(pdf())).toEqual({ native: false, cancelled: false });
  expect(Filesystem.writeFile).not.toHaveBeenCalled(); expect(click).toHaveBeenCalledTimes(1);
  expect(document.querySelector('a[download]')).toBeNull();
  jest.advanceTimersByTime(60000); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic'); click.mockRestore();
});
