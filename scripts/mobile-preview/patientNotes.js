export const patientNotesEnabled = true;
export const patientCaptureEnabled = true;
export const localDate = () => '2026-10-11';
export const patient = { patientId: 'synthetic-only', name: 'Jordan Example', visitCount: 2, dateOfBirth: '1980-01-01', lastVisitDate: '2026-10-11' };
export const note = { timestamp: '1791748800000', version: 'v1', patientId: patient.patientId, visitLabel: 'Follow-up', dateOfService: '2026-10-11', visitType: 'followUp', ready: true, note: 'Subjective: Synthetic review fixture.\nObjective: Synthetic findings.\nAssessment:\nM54.2 — Cervicalgia\nPlan: Synthetic follow-up.' };
export async function patientRequest(operation) {
  if (operation === 'listPatients') return { items: [patient] };
  if (operation === 'getPatient') return { patient, diagnosis: null };
  if (operation === 'getPatientVisits') return { patient, notes: [note, { ...note, timestamp: '1791662400000', dateOfService: '2026-10-10', visitLabel: 'Initial exam' }] };
  if (operation === 'getSavedNote') return { note };
  if (operation === 'getSignature') return { name: 'Synthetic Clinician', npi: '1234567890' };
  throw new Error('This synthetic preview does not write data.');
}
export async function exportPatientNotes() { return { native: true, cancelled: true }; }
