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
  expect(container.querySelector('legend').textContent).toBe('Patient Name');
  expect(container.querySelector('input').placeholder).toBe('Select Existing Patient, Add New or Leave Unassigned');
  expect(container.querySelector('.patient-selection')).toBeNull();
  expect(container.querySelector('.patient-help')).toBeNull();
});
test('typed selection retains default capture metadata and clearing search hides results', async () => {
  const change = jest.fn();
  patientRequest.mockResolvedValue({ items: [{ patientId: 'p', name: 'Jordan Example', visitCount: 2, dateOfInjury: '2026-09-01' }], nextCursor: null });
  await act(async () => root.render(<PatientCapturePicker onChange={change} />));
  await type('Jordan'); await act(async () => jest.advanceTimersByTime(250));
  expect(patientRequest).toHaveBeenCalledWith('listPatients', { search: 'Jordan', limit: 25 });
  await act(async () => container.querySelector('.patient-picker-list button').click());
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'p', dateOfService: '2026-10-11', visitType: 'followUp', contextMode: 'patient' }));
  expect(container.querySelector('.patient-picker-list')).toBeNull();
  await act(async () => root.render(<PatientCapturePicker value={change.mock.calls[0][0]} onChange={change} />));
  expect(container.querySelector('input')).toBeNull();
  expect(container.textContent).not.toContain('Use saved patient history');
  expect(container.querySelector('.patient-selected-name').textContent).toBe('Jordan Example');
  await act(async () => container.querySelector('[aria-label="Clear patient selection"]').click());
  expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ patientId: null, dateOfService: '2026-10-11', visitType: null, contextMode: 'patient' }));
  await act(async () => root.render(<PatientCapturePicker value={change.mock.calls.at(-1)[0]} onChange={change} />));
  expect(container.querySelector('input[type=search]').value).toBe('');
});
test('new patient selection requests an initial exam and automatic history', async () => {
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'new-patient-id' } });
  const change = jest.fn();
  patientRequest.mockResolvedValue({ items: [], nextCursor: null });
  await act(async () => root.render(<PatientCapturePicker onChange={change} />));
  await type('New Example');
  await act(async () => [...container.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.includes('Create New Patient:')).click());
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'new-patient-id', patientName: 'New Example', visitType: 'initialExam', contextMode: 'patient' }));
});
test('Add New catches an existing name across pages and preserves the search for selection', async () => {
  const change = jest.fn();
  patientRequest.mockResolvedValueOnce({ items: [], nextCursor: 'page-2' }).mockResolvedValueOnce({ items: [{ patientId: 'existing', name: 'Jordan Example', visitCount: 2 }], nextCursor: null });
  await act(async () => root.render(<PatientCapturePicker onChange={change} />));
  await type('  jordan   EXAMPLE  ');
  await act(async () => [...container.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.includes('Create New Patient:')).click());
  expect(change).not.toHaveBeenCalled();
  expect(container.querySelector('[role=alert]').textContent).toContain('already exists');
  expect(container.querySelector('input').value).toBe('  jordan   EXAMPLE  ');
  await act(async () => container.querySelector('.patient-picker-list button').click());
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'existing', patientName: undefined }));
});
test('failed duplicate lookup keeps the name and does not select a new patient', async () => {
  const change = jest.fn(); patientRequest.mockRejectedValue(new Error('Offline'));
  await act(async () => root.render(<PatientCapturePicker onChange={change} />));
  await type('New Example');
  await act(async () => [...container.querySelectorAll('button')].find(button => button.getAttribute('aria-label')?.includes('Create New Patient:')).click());
  expect(change).not.toHaveBeenCalled();
  expect(container.querySelector('[role=alert]').textContent).toContain('Please try Add New again');
  expect(container.querySelector('input').value).toBe('New Example');
});
test('preparing a typed name for recording confirmation preserves the draft without selecting it', async () => {
  const change = jest.fn(); const draftChange = jest.fn(); const ref = React.createRef();
  patientRequest.mockResolvedValue({ items: [], nextCursor: null });
  await act(async () => root.render(<PatientCapturePicker ref={ref} onChange={change} onDraftChange={draftChange} />));
  await type('  New   Example  ');
  expect(draftChange).toHaveBeenLastCalledWith('New Example');
  expect(container.querySelector('.patient-create-option').textContent).toContain('+ Add');
  let prepared;
  await act(async () => { prepared = await ref.current.prepareNewPatient(); });
  expect(prepared).toEqual(expect.objectContaining({ patientName: 'New Example', visitType: 'initialExam' }));
  expect(change).not.toHaveBeenCalled();
  expect(container.querySelector('input').value).toBe('  New   Example  ');
});

test('create row is one button whose accessible name retains all visible wording and the full long name', async () => {
  const name = 'Alexandra Fictional Example '.repeat(12).trim();
  await act(async () => root.render(<PatientCapturePicker onChange={jest.fn()} />));
  await type(name);
  const buttons = container.querySelectorAll('.patient-create-actions button');
  expect(buttons).toHaveLength(1);
  expect(buttons[0].getAttribute('aria-label')).toBe(`Create New Patient: “${name}” + Add`);
  expect(buttons[0].querySelector('.patient-create-name').textContent).toBe(`Create New Patient: “${name}”`);
  expect(buttons[0].querySelector('button')).toBeNull();
});

test('editing a name while its check is pending invalidates the prepared identity', async () => {
  let resolveLookup;
  patientRequest.mockImplementation(() => new Promise(resolve => { resolveLookup = resolve; }));
  const ref = React.createRef();
  await act(async () => root.render(<PatientCapturePicker ref={ref} onChange={jest.fn()} />));
  await type('First Name');
  let preparation;
  act(() => { preparation = ref.current.prepareNewPatient(); });
  await type('Second Name');
  let result;
  await act(async () => { resolveLookup({ items: [], nextCursor: null }); result = await preparation; });
  expect(result).toBeUndefined();
  expect(container.querySelector('input').value).toBe('Second Name');
});

test('date and visit controls remain available in the Patients visit editor', () => {
  act(() => root.render(<PatientCapturePicker onChange={() => {}} showVisitDetails />));
  expect(container.querySelectorAll('input[type=date]')).toHaveLength(2);
  expect(container.querySelector('select')).not.toBeNull();
});
