import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { deliverPatientPdf } from './patientPdfDelivery';

export const patientNotesEnabled = process.env.REACT_APP_PATIENT_NOTES_ENABLED === 'true';
export const patientCaptureEnabled = patientNotesEnabled && process.env.REACT_APP_PATIENT_CAPTURE_ENABLED !== 'false';
const queries = new Set(['listPatients', 'getPatient', 'getPatientVisits', 'getPatientContext', 'getSavedNote', 'getSignature']);
const operations = new Set([...queries, 'createPatient', 'updatePatient', 'assignNoteToPatient', 'updateVisitMetadata', 'updateNoteLabel', 'saveNote', 'saveSignature', 'initializeCapture', 'reviewProfileSuggestions']);
let client;
let cacheOwner;
let cacheRevision = 0;
const patientCache = new Map();
const pendingPatients = new Map();
export async function patientRequest(operation, input = {}) {
  if (!operations.has(operation)) throw new Error('Unsupported patient operation.');
  const session = await fetchAuthSession();
  const authToken = session.tokens?.accessToken?.toString();
  if (!authToken) throw new Error('Please sign in again.');
  const owner = session.tokens?.accessToken?.payload?.sub;
  if (cacheOwner !== owner) { patientCache.clear(); cacheOwner = owner; cacheRevision++; }
  const cacheKey = owner && operation === 'getPatient' && !input.includeDiagnosis && !input.includeDeletionSummary ? input.patientId : null;
  const cached = cacheKey && patientCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  client ??= generateClient();
  const fetchResult = () => client.graphql({ query: `${queries.has(operation) ? 'query' : 'mutation'} PatientRequest($input:AWSJSON!){${operation}(input:$input)}`,
    variables: { input: JSON.stringify(input) }, authMode: 'userPool', authToken });
  const readRevision = cacheRevision;
  const requestKey = cacheKey ? `${owner}:${cacheKey}` : null;
  const request = (requestKey && pendingPatients.get(requestKey)) || fetchResult();
  if (requestKey) pendingPatients.set(requestKey, request);
  let result;
  try { result = await request; } finally { if (requestKey && pendingPatients.get(requestKey) === request) pendingPatients.delete(requestKey); }
  if (result.errors?.length) throw new Error('The patient service could not complete this request.');
  const raw = result.data?.[operation];
  const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!value?.ok) { const error = new Error(value?.message || 'The patient service is unavailable.'); error.code = value?.code; throw error; }
  if (cacheKey && readRevision === cacheRevision) {
    if (patientCache.size >= 500) patientCache.clear();
    patientCache.set(cacheKey, { value, expires: Date.now() + 15_000 });
  }
  if (['createPatient', 'updatePatient', 'reviewProfileSuggestions', 'assignNoteToPatient', 'updateVisitMetadata'].includes(operation)) {
    patientCache.clear(); pendingPatients.clear(); cacheRevision++; window.dispatchEvent(new Event('patient-profile-changed'));
  }
  return value;
}
export function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function captureSnapshot(value) {
  if (!patientCaptureEnabled || !value) return undefined;
  return Object.freeze({ patientId: value.patientId || null, ...(value.patientName ? { patientName: value.patientName.trim() } : {}),
    dateOfService: value.dateOfService || localDate(), dateOfInjury: value.dateOfInjury || null,
    visitType: value.visitType || null, contextMode: value.contextMode === 'none' ? 'none' : 'patient' });
}
export function recordingSettingsSnapshot() {
  try { const value = JSON.parse(localStorage.getItem('noteSettings') || '{}'); return Object.freeze({ examLayout: value.examLayout === true, PILayout: value.PILayout === true }); }
  catch { return Object.freeze({ examLayout: false, PILayout: false }); }
}
export async function exportPatientNotes(input) {
  const endpoint = process.env.REACT_APP_PATIENT_EXPORT_URL;
  if (!endpoint || !endpoint.startsWith('https://')) throw new Error('PDF export is not enabled for this release.');
  const session = await fetchAuthSession();
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.tokens?.accessToken?.toString() || ''}` }, body: JSON.stringify(input) });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = new Error(result.message || 'The PDF could not be prepared.'); Object.assign(error, result); throw error;
  }
  const blob = await response.blob();
  const length = Number(response.headers.get('X-PDF-Byte-Length'));
  if (!Number.isSafeInteger(length) || length <= 0 || blob.size !== length || blob.type !== 'application/pdf' || blob.size > 20 * 1024 * 1024) throw new Error('The export response was not a supported PDF.');
  return deliverPatientPdf(blob);
}

export async function retrySavedGeneration(note) {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();
  if (!accessToken) throw new Error('Please sign in again.');
  const response = await fetch('https://rmg4v7tjipa3lb5e5jkyjyc3ri0vdqmn.lambda-url.us-east-2.on.aws/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: note.owner, timeStamp: note.timestamp, accessToken, noteSettings: {} }),
  });
  if (!response.ok || !response.body) throw new Error('Generation could not start. The saved recording is unchanged.');
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let preview = '';
  while (true) {
    const chunk = await reader.read(); preview += decoder.decode(chunk.value, { stream: !chunk.done });
    if (preview.length > 1_000_000) { await reader.cancel(); throw new Error('The generation response exceeded its size limit.'); }
    if (chunk.done) break;
  }
  if (preview.includes('\u0000ERROR:') || /^\s*\{/.test(preview)) throw new Error('Generation did not save a new note. Review the visit details or retry when the transcript is complete.');
  const result = await patientRequest('getSavedNote', { timestamp: note.timestamp });
  if (!result.note.ready || result.note.version === note.version) throw new Error('A new completed note has not been saved yet.');
  return result.note;
}
