import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useClipboardSave from './useClipboardSave';
import { patientRequest } from '../../services/patientNotes';
jest.mock('../../services/patientNotes', () => ({ patientRequest: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let root, container, hook;
const note = { timestamp: 't', version: 'v1', note: 'Original note' };
function Harness(props) { hook = useClipboardSave(props); return null; }
beforeEach(() => { patientRequest.mockReset(); Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: jest.fn(() => 'request-id') } }); container = document.createElement('div'); root = createRoot(container); });
afterEach(() => act(() => root.unmount()));
test('saves the loaded version without implicitly rewriting diagnosis codes', async () => {
  const onSaved = jest.fn(); patientRequest.mockResolvedValue({ status: 'SAVED', note: { ...note, version: 'v2', note: 'Edited note' } });
  act(() => root.render(<Harness note={note} draft="Edited note" onSaved={onSaved} />));
  await act(async () => expect(await hook.save()).toBe(true));
  expect(patientRequest).toHaveBeenCalledWith('saveNote', { timestamp: 't', expectedVersion: 'v1', note: 'Edited note', requestId: 'request-id', confirmContextReview: false });
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ version: 'v2' }));
});
test('a conflict keeps the original version and stable request id for retry', async () => {
  const onSaved = jest.fn(), onError = jest.fn(); patientRequest.mockRejectedValue(Object.assign(new Error('Conflict'), { code: 'CONFLICT' }));
  act(() => root.render(<Harness note={note} draft="Edited note" onSaved={onSaved} onError={onError} />));
  await act(async () => { expect(await hook.save()).toBe(false); });
  await act(async () => { expect(await hook.save()).toBe(false); });
  expect(patientRequest.mock.calls[0][1]).toEqual(patientRequest.mock.calls[1][1]);
  expect(onSaved).not.toHaveBeenCalled(); expect(onError).toHaveBeenCalledWith(expect.stringContaining('draft is preserved'));
});
test.each(['CONFIRMATION_REQUIRED', 'CONTEXT_REVIEW_REQUIRED'])('%s stays inline with the exact draft', async status => {
  const onSaved = jest.fn(); patientRequest.mockResolvedValue({ status, confirmationToken: 'signed-token', icdCodes: [] });
  act(() => root.render(<Harness note={note} draft="Edited note" onSaved={onSaved} />));
  await act(async () => expect(await hook.save()).toBe('confirmation'));
  expect(onSaved).not.toHaveBeenCalled(); expect(hook.review.key).toBe(JSON.stringify(['t', 'v1', 'Edited note']));
  expect(hook.review.confirmationToken).toBe('signed-token');
});
const firstVisit = {
  ...note, patientId: 'synthetic-patient', visitType: 'initialExam',
  note: 'Subjective: Synthetic fixture.\nAssessment:\nM54.2 — Cervicalgia\nPlan: Recheck.',
  diagnosisState: { icdCodes: [{ code: 'M54.2', description: 'Cervicalgia', status: 'new' }] },
};
const corrected = firstVisit.note.replace('Plan:', 'M99.01 — Segmental and somatic dysfunction of cervical region\nPlan:');
test('missing first-visit code requires one explicit approval and saves note and full list together', async () => {
  const onSaved = jest.fn();
  act(() => root.render(<Harness note={firstVisit} draft={corrected} onSaved={onSaved} />));
  await act(async () => expect(await hook.save()).toBe('confirmation'));
  expect(patientRequest).not.toHaveBeenCalled();
  expect(hook.review.icdCodes).toEqual([
    { code: 'M54.2', description: 'Cervicalgia', status: 'new' },
    { code: 'M99.01', description: 'Segmental and somatic dysfunction of cervical region', status: 'new' },
  ]);
  patientRequest.mockResolvedValue({ status: 'SAVED', note: { ...firstVisit, note: corrected, version: 'v2' } });
  await act(async () => expect(await hook.confirm(hook.review)).toBe(true));
  expect(patientRequest).toHaveBeenCalledWith('saveNote', expect.objectContaining({
    timestamp: 't', expectedVersion: 'v1', note: corrected, diagnosisCodes: expect.arrayContaining([expect.objectContaining({ code: 'M99.01' })]),
  }));
  expect(hook.review).toBeNull();
});
test('editing after review invalidates the approval and prevents saving an old proposal', async () => {
  act(() => root.render(<Harness note={firstVisit} draft={corrected} />));
  await act(async () => hook.save()); const oldReview = hook.review;
  act(() => root.render(<Harness note={firstVisit} draft={corrected + ' Updated.'} />));
  expect(hook.review).toBeNull();
  await act(async () => expect(await hook.confirm(oldReview)).toBe(false));
  expect(patientRequest).not.toHaveBeenCalled();
});
test('a signed server confirmation reuses the request id and does not substitute manual diagnoses', async () => {
  const onSaved = jest.fn();
  patientRequest.mockResolvedValueOnce({ status: 'CONFIRMATION_REQUIRED', confirmationToken: 'token', icdCodes: [{ code: 'M54.2', description: 'Cervicalgia', status: 'continuing' }] })
    .mockResolvedValueOnce({ status: 'SAVED', note: { ...firstVisit, version: 'v2' } });
  act(() => root.render(<Harness note={{ ...firstVisit, visitType: 'reExam' }} draft={corrected} onSaved={onSaved} />));
  await act(async () => hook.save());
  expect(patientRequest.mock.calls[0][1].diagnosisCodes).toBeUndefined();
  await act(async () => hook.confirm(hook.review));
  expect(patientRequest.mock.calls[1][1]).toEqual({ ...patientRequest.mock.calls[0][1], confirmationToken: 'token' });
});
test('context review retains the diagnosis proposal until explicitly acknowledged', async () => {
  const onSaved = jest.fn();
  act(() => root.render(<Harness note={{ ...firstVisit, needsContextReview: true }} draft={corrected} onSaved={onSaved} />));
  await act(async () => hook.save());
  expect(hook.review.needsContextReview).toBe(true); expect(patientRequest).not.toHaveBeenCalled();
  patientRequest.mockResolvedValue({ status: 'SAVED', note: { ...firstVisit, note: corrected, version: 'v2' } });
  await act(async () => hook.confirm({ ...hook.review, contextConfirmed: true }));
  expect(patientRequest.mock.calls[0][1]).toEqual(expect.objectContaining({ confirmContextReview: true, diagnosisCodes: expect.arrayContaining([expect.objectContaining({ code: 'M99.01' })]) }));
});
