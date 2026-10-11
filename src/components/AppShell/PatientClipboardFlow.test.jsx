import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthenticatedApp from './AuthenticatedApp';
import { patientRequest } from '../../services/patientNotes';

jest.mock('../../services/patientNotes', () => ({ patientNotesEnabled: true, patientRequest: jest.fn(), localDate: () => '2026-10-11' }));
jest.mock('../Patients/useDesktopSave', () => () => true);
jest.mock('aws-amplify/auth', () => ({ fetchUserAttributes: jest.fn() }));
jest.mock('react-helmet-async', () => ({ Helmet: () => null }));
jest.mock('../Billing/Billing', () => () => null);
jest.mock('../Billing/PriceTable', () => () => null);
jest.mock('../Settings/Settings', () => () => null);
jest.mock('../Feedback/Feedback', () => () => null);
jest.mock('../IntroTour/IntroTour', () => () => null);
jest.mock('../Recording/RecordingManager', () => () => ({}));
jest.mock('../Recording/Dictation', () => () => ({}));
jest.mock('./useUserAnalytics', () => () => {});
jest.mock('./useNotesHistory', () => () => ({ refreshNotes: jest.fn() }));
jest.mock('../../services/amplifyClient', () => ({ getAmplifyClient: jest.fn() }));
jest.mock('../../utils/analytics', () => ({ trackRecordingCompleted: jest.fn() }));
jest.mock('../Navbar/Navbar', () => () => null);
jest.mock('./MainWorkspace', () => ({ clipboard }) => <main>
  <h2>Your Clipboard</h2><span>{clipboard.target?.timestamp}</span>
  <button disabled={clipboard.save.disabled || clipboard.save.busy} onClick={clipboard.save.onSave}>Save note</button>
  {clipboard.review}<textarea aria-label="Clinical note" ref={clipboard.clipboardTextareaRef} value={clipboard.clipboardContent} onChange={event => clipboard.setClipboardContent(event.target.value)} />
</main>);

global.IS_REACT_ACT_ENVIRONMENT = true;
test('Patients loads exact visit into clipboard and a first-visit addition saves body and diagnoses together', async () => {
  jest.useFakeTimers();
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'synthetic-request' } });
  const patient = { patientId: 'synthetic', name: 'Jordan Example', visitCount: 1 };
  let saved = { timestamp: '123', version: 'v1', patientId: patient.patientId, visitType: 'initialExam', visitLabel: 'Initial visit', dateOfService: '2026-10-01',
    note: 'Subjective: Synthetic fixture.\nAssessment:\nM54.2 — Cervicalgia\nPlan: Recheck.', diagnosisState: { icdCodes: [{ code: 'M54.2', description: 'Cervicalgia', status: 'new' }] } };
  patientRequest.mockImplementation(async (operation, input) => {
    if (operation === 'listPatients') return { items: [patient] };
    if (operation === 'getPatientVisits') return { patient, notes: [{ ...saved, note: 'Display-only row must not be used as the draft' }] };
    if (operation === 'getPatient') return { patient };
    if (operation === 'getSavedNote') return { note: saved };
    if (operation === 'saveNote') {
      expect(input.expectedVersion).toBe(saved.version);
      saved = { ...saved, version: 'v2', note: input.note, diagnosisState: { icdCodes: input.diagnosisCodes } };
      return { status: 'SAVED', note: saved };
    }
    throw new Error(`Unexpected ${operation}`);
  });
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  const click = async text => act(async () => [...container.querySelectorAll('button')].find(node => node.textContent.includes(text)).click());
  await act(async () => root.render(<MemoryRouter initialEntries={['/app/patients']}><Routes><Route path="/app/*" element={<AuthenticatedApp user={{ username: 'synthetic' }} />} /></Routes></MemoryRouter>));
  await act(async () => jest.advanceTimersByTime(250));
  await click('Jordan Example'); await click('Initial visit');
  expect(container.textContent).toContain('Your Clipboard');
  expect(container.querySelector('.patient-note-editor')).toBeNull();
  expect(container.querySelector('textarea').value).toBe(saved.note);
  const corrected = saved.note.replace('Plan:', 'M99.01 — Segmental and somatic dysfunction of cervical region\nPlan:');
  await act(async () => {
    const area = container.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, corrected);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('Save note');
  expect(container.textContent).toContain('Confirm diagnosis changes');
  expect(patientRequest.mock.calls.filter(([op]) => op === 'saveNote')).toHaveLength(0);
  await click('Confirm and save');
  expect(saved.note).toBe(corrected);
  expect(saved.diagnosisState.icdCodes).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'M99.01', status: 'new' })]));
  expect(saved.patientId).toBe('synthetic'); expect(saved.dateOfService).toBe('2026-10-01');
  expect(container.querySelector('.clipboard-save-review')).toBeNull();
  expect([...container.querySelectorAll('button')].find(node => node.textContent === 'Save note').disabled).toBe(true);
  act(() => root.unmount()); container.remove(); jest.useRealTimers();
});
