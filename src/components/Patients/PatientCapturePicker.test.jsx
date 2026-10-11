import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import PatientCapturePicker from './PatientCapturePicker';
import { patientRequest } from '../../services/patientNotes';
jest.mock('../../services/patientNotes', () => ({ patientRequest: jest.fn(), localDate: () => '2026-10-11' }));

global.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
beforeEach(() => { jest.useFakeTimers(); patientRequest.mockReset(); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); jest.useRealTimers(); });
const type = async value => act(async () => {
  const input = container.querySelector('input[type=search]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
test('recording has no roster request or visit fields until a name is typed', async () => {
  await act(async () => root.render(<PatientCapturePicker onChange={() => {}} />));
  await act(async () => jest.advanceTimersByTime(250));
  expect(patientRequest).not.toHaveBeenCalled();
  expect(container.querySelector('input[type=date]')).toBeNull();
  expect(container.querySelector('select')).toBeNull();
  expect(container.textContent).toContain('Unassigned');
});
test('typed selection retains default capture metadata and clearing search hides results', async () => {
  const change = jest.fn();
  patientRequest.mockResolvedValue({ items: [{ patientId: 'p', name: 'Jordan Example', visitCount: 2, dateOfInjury: '2026-09-01' }], nextCursor: null });
  await act(async () => root.render(<PatientCapturePicker onChange={change} />));
  await type('Jordan'); await act(async () => jest.advanceTimersByTime(250));
  expect(patientRequest).toHaveBeenCalledWith('listPatients', { search: 'Jordan', limit: 25 });
  await act(async () => container.querySelector('.patient-picker-list button').click());
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p', dateOfService: '2026-10-11', visitType: null, contextMode: 'patient' }));
  expect(container.querySelector('.patient-picker-list')).toBeNull();
  await act(async () => root.render(<PatientCapturePicker value={change.mock.calls[0][0]} onChange={change} />));
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Unassigned visit').click());
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ patientId: null, dateOfService: '2026-10-11' }));
});
test('date and visit controls remain available in the Patients visit editor', () => {
  act(() => root.render(<PatientCapturePicker onChange={() => {}} showVisitDetails />));
  expect(container.querySelectorAll('input[type=date]')).toHaveLength(2);
  expect(container.querySelector('select')).not.toBeNull();
});
