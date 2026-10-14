import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Recording from './Recording';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

const mockGraphql = jest.fn();
let mockPatientCaptureEnabled = true;
const mockPrepareNewPatient = jest.fn();

jest.mock('aws-amplify/auth', () => ({ getCurrentUser: jest.fn(), fetchAuthSession: jest.fn() }));
jest.mock('aws-amplify/api', () => ({ generateClient: () => ({ graphql: (...args) => mockGraphql(...args) }) }));
jest.mock('../../utils/analytics', () => ({ trackRecordingStart: jest.fn() }));
jest.mock('../../services/patientNotes', () => ({ get patientCaptureEnabled() { return mockPatientCaptureEnabled; }, localDate: () => '2026-10-11' }));
jest.mock('../Patients/PatientCapturePicker', () => {
  const React = require('react');
  return React.forwardRef(({ value, onChange, onDraftChange }, ref) => {
    React.useImperativeHandle(ref, () => ({ prepareNewPatient: mockPrepareNewPatient }));
    return <div>
  <button onClick={() => onDraftChange('Typed Example')}>Type patient name</button>
  <button onClick={() => onChange({ ...value, patientId: 'existing', patientName: undefined, visitType: 'followUp' })}>Existing patient</button>
  <button onClick={() => onChange({ ...value, patientId: 'new', patientName: 'New Example', visitType: 'initialExam' })}>New patient</button>
  <button onClick={() => onChange({ ...value, patientId: null, patientName: undefined, visitType: null })}>Clear patient</button>
</div>;
  });
});

global.IS_REACT_ACT_ENVIRONMENT = true;
let container, root, startRecording;
beforeEach(async () => {
  mockPatientCaptureEnabled = true;
  mockPrepareNewPatient.mockReset();
  mockPrepareNewPatient.mockResolvedValue({ patientId: 'draft-id', patientName: 'Typed Example', displayName: 'Typed Example', visitType: 'initialExam' });
  localStorage.setItem('noteSettings', JSON.stringify({ examLayout: true, PILayout: true }));
  getCurrentUser.mockResolvedValue({ username: 'synthetic' });
  fetchAuthSession.mockResolvedValue({});
  mockGraphql.mockResolvedValue({ data: { getUserSubscription: { hoursleft: 1 } } });
  container = document.createElement('div'); root = createRoot(container);
  startRecording = jest.fn();
  await act(async () => root.render(<Recording startRecording={startRecording} />));
});
afterEach(() => { act(() => root.unmount()); localStorage.clear(); });
const click = async text => act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === text).click());

test('typed unselected name waits for confirmation and starts with the confirmed metadata', async () => {
  await click('Type patient name');
  await click('Start Recording');
  expect(startRecording).not.toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Create new patient?"]').textContent).toContain('Typed Example');
  await click('Create patient & record');
  expect(startRecording).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'draft-id', patientName: 'Typed Example', visitType: 'initialExam', contextMode: 'patient' }));
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(true);
});

test('closing the prompt cancels without starting or selecting the draft', async () => {
  await click('Type patient name');
  await click('Start Recording');
  await act(async () => container.querySelector('[aria-label="Close Create new patient?"]').click());
  expect(startRecording).not.toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Create new patient?"]')).toBeNull();
  await click('Start Recording');
  expect(mockPrepareNewPatient).toHaveBeenCalledTimes(2);
});

test('continue unassigned starts without the typed patient identity or an initial exam', async () => {
  await click('Type patient name');
  await click('Start Recording');
  await click('Record without a patient');
  expect(startRecording).toHaveBeenCalledWith(expect.objectContaining({ patientId: null, patientName: undefined, displayName: '', visitType: null, contextMode: 'patient' }));
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(false);
  expect(container.querySelector('[aria-label="Create new patient?"]')).toBeNull();
});

test('duplicate or failed name check does not show confirmation or start recording', async () => {
  mockPrepareNewPatient.mockResolvedValue(undefined);
  await click('Type patient name');
  await click('Start Recording');
  expect(startRecording).not.toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Create new patient?"]')).toBeNull();
});

test('existing patients default to follow-up and Re-Exam occupies the left option', async () => {
  // Existing selections bypass typed-name confirmation.
  await click('Existing patient');
  const checkbox = container.querySelector('#re-exam-popup');
  expect(checkbox.checked).toBe(false);
  expect(container.querySelector('.checkbox-grid input')).toBe(checkbox);
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(expect.objectContaining({ visitType: 'followUp', contextMode: 'patient' }));
  expect(JSON.parse(localStorage.getItem('noteSettings'))).toEqual({ examLayout: false, PILayout: true });
  await act(async () => checkbox.click());
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(expect.objectContaining({ visitType: 'reExam' }));
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(true);
});

test('confirmation starts microphone synchronously before subscription validation', async () => {
  await click('Type patient name');
  await click('Start Recording');
  const order = [];
  startRecording.mockImplementation(() => order.push('microphone'));
  getCurrentUser.mockImplementation(() => { order.push('subscription'); return new Promise(() => {}); });
  act(() => [...container.querySelectorAll('button')].find(button => button.textContent === 'Create patient & record').click());
  expect(order).toEqual(['microphone', 'subscription']);
});

test('blank patient and disabled capture retain direct recording', async () => {
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(expect.objectContaining({ visitType: null }));
  mockPatientCaptureEnabled = false;
  await act(async () => root.render(<Recording startRecording={startRecording} />));
  expect(container.querySelector('#exam-layout-popup')).not.toBeNull();
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(undefined);
  expect(mockPrepareNewPatient).not.toHaveBeenCalled();
});

test('new patients automatically use initial exam; clearing resets the choice', async () => {
  await click('New patient');
  expect(container.querySelector('#re-exam-popup')).toBeNull();
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(expect.objectContaining({ visitType: 'initialExam', contextMode: 'patient' }));
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(true);
  await click('Clear patient');
  expect(container.querySelector('#re-exam-popup')).toBeNull();
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(expect.objectContaining({ patientId: null, visitType: null }));
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(false);
});
test('pending native microphone acquisition remains cancellable and hides settings', async () => {
  const discardRecording = jest.fn();
  const toggleRecordingPopup = jest.fn();
  await act(async () => root.render(<Recording isStarting discardRecording={discardRecording} toggleRecordingPopup={toggleRecordingPopup} />));
  expect(container.textContent).toContain('Opening microphone');
  expect(container.textContent).not.toContain('Start Recording');
  await click('Cancel recording');
  expect(discardRecording).toHaveBeenCalledTimes(1);
  expect(toggleRecordingPopup).toHaveBeenCalledTimes(1);
});
