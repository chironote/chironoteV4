import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNativePlatform } from './nativePlatform';
import { randomId } from '../utils/randomId';

const CACHE_FOLDER = 'patient-pdf-exports';
const MAX_CACHE_AGE_MS = 10 * 60 * 1000;
const activeFiles = new Set();
let sharing = false;
const removeFile = path => Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {});

// Only our generic PDF files are eligible. Never enumerate user documents.
export async function cleanupPatientPdfCache() {
  if (!isNativePlatform()) return;
  try {
    const { files } = await Filesystem.readdir({ path: CACHE_FOLDER, directory: Directory.Cache });
    await Promise.all(files.filter(file => /^Patient-notes-\d+-[a-z0-9-]+\.pdf$/.test(file.name))
      .filter(file => !activeFiles.has(`${CACHE_FOLDER}/${file.name}`) && Date.now() - Number(file.name.split('-')[2]) >= MAX_CACHE_AGE_MS)
      .map(file => removeFile(`${CACHE_FOLDER}/${file.name}`)));
  } catch { /* The cache folder does not exist before the first export. */ }
}

const base64Pdf = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = () => reject(new Error('The PDF could not be prepared for sharing.'));
  reader.readAsDataURL(blob);
});

export async function deliverPatientPdf(blob) {
  if (!isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'Patient-notes.pdf'; document.body.appendChild(link);
    try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    return { native: false, cancelled: false };
  }
  if (sharing) throw new Error('Finish sharing the current PDF before creating another.');
  sharing = true;
  let path;
  try {
    await cleanupPatientPdfCache();
    if (!(await Share.canShare()).value) throw new Error('Sharing unavailable');
    path = `${CACHE_FOLDER}/Patient-notes-${Date.now()}-${randomId()}.pdf`;
    activeFiles.add(path);
    const { uri } = await Filesystem.writeFile({ path, directory: Directory.Cache, data: await base64Pdf(blob), recursive: true });
    await Share.share({ title: 'Patient notes PDF', files: [uri], dialogTitle: 'Save or share PDF' });
    // Keep the file briefly while the receiving app reads it. Foreground/export
    // cleanup also handles a process that ended before this timer could run.
    setTimeout(() => { activeFiles.delete(path); removeFile(path); }, MAX_CACHE_AGE_MS);
    return { native: true, cancelled: false };
  } catch (error) {
    if (path) { activeFiles.delete(path); await removeFile(path); }
    if (/^share cancel(?:ed|led)$/i.test(error?.message || '') || error?.code === 'USER_CANCELLED') return { native: true, cancelled: true };
    throw new Error('The PDF could not be shared. Please try again.');
  } finally { sharing = false; }
}
