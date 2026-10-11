import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ReassignPatientDialog from './ReassignPatientDialog';
import { patientRequest } from '../../services/patientNotes';
jest.mock('../../services/patientNotes', () => ({ patientRequest: jest.fn(), patientNotesEnabled: true, localDate: () => '2026-10-11' }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
const note = { timestamp: '123', version: 'v1', note: 'Synthetic original body', patientId: 'old', visitType: 'initialExam' };
const button = text => [...container.querySelectorAll('button')].find(element => element.textContent === text);
beforeEach(() => {
  jest.useFakeTimers(); patientRequest.mockReset();
  patientRequest.mockImplementation(async operation => {
    if (operation === 'getSavedNote') return { note };
    if (operation === 'getPatient') return { patient: { name: 'Jordan Example' } };
    if (operation === 'listPatients') return { items: [{ patientId: 'new', name: 'Taylor Example' }], nextCursor: null };
    return { status: 'UPDATED', note: { ...note, patientId: 'new', version: 'v2' } };
  });
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); jest.useRealTimers(); });
async function selectPatient() {
  await act(async () => {
    const input = container.querySelector('input[type=search]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Taylor');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => jest.advanceTimersByTime(250));
  await act(async () => container.querySelector('.patient-picker-list button').click());
  const warning = container.querySelector('.patient-delete-warning input');
  if (warning) await act(async () => warning.click());
}
test.each(['old', null])('reassigns %s with destination-code copying delegated to the server', async patientId => {
  patientRequest.mockImplementationOnce(async () => ({ note: { ...note, patientId } }));
  const assigned = jest.fn();
  await act(async () => root.render(<ReassignPatientDialog timestamp="123" onClose={() => {}} onAssigned={assigned} />));
  expect(button('Re-Assign').disabled).toBe(true);
  await selectPatient();
  await act(async () => button('Re-Assign').click());
  expect(patientRequest).toHaveBeenCalledWith('assignNoteToPatient', { timestamp: '123', expectedVersion: 'v1', patientId: 'new', copyPatientDiagnoses: true, ...(patientId ? { deleteEmptyPatient: true } : {}) });
  expect(assigned).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'new', note: note.note, version: 'v2' }));
});
test('Cancel never writes a selection', async () => {
  const close = jest.fn();
  await act(async () => root.render(<ReassignPatientDialog timestamp="123" onClose={close} onAssigned={() => {}} />));
  await selectPatient(); await act(async () => button('Cancel').click());
  expect(close).toHaveBeenCalledTimes(1);
  expect(patientRequest.mock.calls.some(([op]) => op === 'assignNoteToPatient' || op === 'createPatient')).toBe(false);
});
test('conflict preserves selection and does not claim success', async () => {
  const assigned = jest.fn();
  await act(async () => root.render(<ReassignPatientDialog timestamp="123" onClose={() => {}} onAssigned={assigned} />));
  await selectPatient(); patientRequest.mockRejectedValueOnce(Object.assign(new Error('Conflict'), { code: 'CONFLICT' }));
  await act(async () => button('Re-Assign').click());
  expect(container.querySelector('[role=alert]').textContent).toContain('Cancel and reopen');
  expect(container.querySelector('.patient-selected-name').textContent).toBe('Taylor Example');
  expect(assigned).not.toHaveBeenCalled();
});
test('busy dialog consumes Escape and prevents closing during a write', async () => {
  const close = jest.fn(); const escaped = jest.fn();
  await act(async () => root.render(<div onKeyDown={escaped}><ReassignPatientDialog timestamp="123" onClose={close} onAssigned={() => {}} /></div>));
  await selectPatient(); let finish;
  patientRequest.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => button('Re-Assign').click());
  await act(async () => container.querySelector('[role=dialog]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(close).not.toHaveBeenCalled(); expect(escaped).not.toHaveBeenCalled(); expect(button('Cancel').disabled).toBe(true);
  await act(async () => finish({ status: 'UPDATED', note: { ...note, patientId: 'new' } }));
});
