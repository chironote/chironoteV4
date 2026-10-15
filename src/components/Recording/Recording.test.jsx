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

test('blank selection starts directly without a duplicate check', async () => {
  await click('Start Recording');
  expect(startRecording).toHaveBeenCalledWith(expect.objectContaining({ visitType: null }));
  expect(mockPrepareNewPatient).not.toHaveBeenCalled();
});

test('flag-off keeps the direct recording workflow without patient metadata', async () => {
  mockPatientCaptureEnabled = false;
  await act(async () => root.render(<Recording startRecording={startRecording} />));
  expect(container.querySelector('#exam-layout-popup')).not.toBeNull();
  await click('Start Recording');
  expect(startRecording).toHaveBeenCalledWith(undefined);
  expect(mockPrepareNewPatient).not.toHaveBeenCalled();
});

test('confirmation starts capture synchronously before subscription lookup', async () => {
  await click('Type patient name');
  await click('Start Recording');
  getCurrentUser.mockClear();
  startRecording.mockImplementation(() => expect(getCurrentUser).not.toHaveBeenCalled());
  act(() => {
    [...container.querySelectorAll('button')].find(button => button.textContent === 'Create patient & record').click();
    expect(startRecording).toHaveBeenCalledTimes(1);
  });
  await act(async () => {});
  expect(getCurrentUser).toHaveBeenCalledTimes(1);
});

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
  expect(JSON.parse(localStorage.getItem('noteSettings'))).toEqual({ examLayout: true, PILayout: true });
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

test('new patients force a visible disabled exam; clearing restores manual preference', async () => {
  await act(async () => container.querySelector('#exam-layout-popup').click());
  await click('New patient');
  expect(container.querySelector('#exam-layout-popup').checked).toBe(true);
  expect(container.querySelector('#exam-layout-popup').disabled).toBe(true);
  expect(container.querySelector('.checkbox-group-disabled')).not.toBeNull();
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

// Read settings inside the callback, matching RecordingManager's synchronous snapshot boundary.
test.each([[true, true], [true, false], [false, true], [false, false]])('unassigned Exam %s and PI %s reach direct and confirmed capture', async (exam, pi) => {
  if (!pi) await act(async () => container.querySelector('#pi-layout-popup').click());
  if (!exam) await act(async () => container.querySelector('#exam-layout-popup').click());
  const captures = [];
  startRecording.mockImplementation(metadata => captures.push({ metadata, settings: JSON.parse(localStorage.getItem('noteSettings')) }));
  await click('Start Recording');
  expect(captures[0].settings).toEqual({ examLayout: exam, PILayout: pi });
  await click('Type patient name');
  await click('Start Recording');
  const dialog = container.querySelector('[aria-label="Create new patient?"]');
  expect(dialog.querySelector('input')).toBeNull();
  await click('Record without a patient');
  expect(captures[1]).toEqual({ metadata: expect.objectContaining({ patientId: null, patientName: undefined, visitType: null, initialExam: false }), settings: { examLayout: exam, PILayout: pi } });
  await act(async () => container.querySelector('#pi-layout-popup').click());
  expect(captures[0].settings.PILayout).toBe(pi);
});

test('forced exam cannot become the persisted manual preference after remount', async () => {
  await act(async () => container.querySelector('#exam-layout-popup').click());
  await click('New patient');
  await click('Start Recording');
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(true);
  act(() => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(<Recording startRecording={startRecording} />));
  expect(container.querySelector('#exam-layout-popup').checked).toBe(false);
  expect(container.querySelector('#exam-layout-popup').disabled).toBe(false);
});

test('clearing an existing re-exam restores manual exam and preserves PI', async () => {
  await act(async () => container.querySelector('#exam-layout-popup').click());
  await act(async () => container.querySelector('#pi-layout-popup').click());
  await click('Existing patient');
  await act(async () => container.querySelector('#re-exam-popup').click());
  await click('Start Recording');
  await click('Clear patient');
  expect(container.querySelector('#exam-layout-popup').checked).toBe(false);
  await click('Start Recording');
  expect(JSON.parse(localStorage.getItem('noteSettings'))).toEqual({ examLayout: false, PILayout: false });
});
