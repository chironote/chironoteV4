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
test.each(['CONFIRMATION_REQUIRED', 'CONTEXT_REVIEW_REQUIRED'])('%s opens guarded review with the exact draft', async status => {
  const onReview = jest.fn(), onSaved = jest.fn(); patientRequest.mockResolvedValue({ status });
  act(() => root.render(<Harness note={note} draft="Edited note" onReview={onReview} onSaved={onSaved} />));
  await act(async () => expect(await hook.save()).toBe('confirmation'));
  expect(onSaved).not.toHaveBeenCalled(); expect(onReview).toHaveBeenCalledWith({ note, text: 'Edited note' });
});
