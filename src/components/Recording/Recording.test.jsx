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

test.each([true, false])('typed unselected name waits for confirmation and forces initial exam from manual=%s', async manualExamLayout => {
  if (!manualExamLayout) await act(async () => container.querySelector('#exam-layout-popup').click());
  await click('Type patient name');
  await click('Start Recording');
  expect(startRecording).not.toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Create new patient?"]').textContent).toContain('Typed Example');
  expect(container.querySelector('.recording-patient-prompt').textContent).toBe('Typed Example');
  await click('Create patient & record');
  expect(startRecording).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'draft-id', patientName: 'Typed Example', visitType: 'initialExam', contextMode: 'patient' }));
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(true);
});

test.each(['Create patient & record', 'Record without a patient'])('%s starts microphone synchronously before subscription lookup', async action => {
  await click('Type patient name');
  await click('Start Recording');
  getCurrentUser.mockClear();
  const button = [...container.querySelectorAll('button')].find(item => item.textContent === action);
  act(() => {
    button.click();
    expect(startRecording).toHaveBeenCalledTimes(1);
    expect(startRecording.mock.invocationCallOrder[0]).toBeLessThan(getCurrentUser.mock.invocationCallOrder[0]);
  });
  await act(async () => {});
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

test.each([true, false])('continue unassigned preserves exam=%s and PI while clearing typed patient linkage', async examLayout => {
  if (!examLayout) await act(async () => container.querySelector('#exam-layout-popup').click());
  await click('Type patient name');
  await click('Start Recording');
  await click('Record without a patient');
  expect(startRecording).toHaveBeenCalledWith(expect.objectContaining({ patientId: null, patientName: undefined, displayName: '', dateOfInjury: null, visitType: null, contextMode: 'patient' }));
  expect(JSON.parse(localStorage.getItem('noteSettings'))).toMatchObject({ examLayout, PILayout: true });
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
  expect(JSON.parse(localStorage.getItem('noteSettings'))).toMatchObject({ examLayout: false, PILayout: true });
  await act(async () => checkbox.click());
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(expect.objectContaining({ visitType: 'reExam' }));
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(true);
});

test.each([true, false])('new patients force a visible disabled exam; clearing restores manual exam=%s', async manualExamLayout => {
  if (!manualExamLayout) await act(async () => container.querySelector('#exam-layout-popup').click());
  await click('New patient');
  expect(container.querySelector('#re-exam-popup')).toBeNull();
  const exam = container.querySelector('#exam-layout-popup');
  expect(exam.checked).toBe(true);
  expect(exam.disabled).toBe(true);
  expect(container.querySelector('label[for="exam-layout-popup"]').textContent).toBe('Exam Layout');
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(expect.objectContaining({ visitType: 'initialExam', contextMode: 'patient' }));
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(true);
  await click('Clear patient');
  expect(container.querySelector('#re-exam-popup')).toBeNull();
  expect(container.querySelector('#exam-layout-popup').checked).toBe(manualExamLayout);
  expect(container.querySelector('#exam-layout-popup').disabled).toBe(false);
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(expect.objectContaining({ patientId: null, visitType: null }));
  expect(JSON.parse(localStorage.getItem('noteSettings'))).toMatchObject({ examLayout: manualExamLayout, PILayout: true });
});

test.each([true, false])('blank unassigned recording freezes exam=%s and PI before microphone start', async examLayout => {
  if (!examLayout) await act(async () => container.querySelector('#exam-layout-popup').click());
  startRecording.mockImplementation(metadata => {
    expect(metadata).toMatchObject({ visitType: null, contextMode: 'patient' });
    expect(JSON.parse(localStorage.getItem('noteSettings'))).toMatchObject({ examLayout, PILayout: true });
  });
  await click('Start Recording');
  expect(startRecording).toHaveBeenCalledTimes(1);
});

test('forced layouts do not replace the manual preference across dialog remounts or patient switches', async () => {
  await act(async () => container.querySelector('#exam-layout-popup').click());
  await click('New patient');
  await click('Existing patient');
  expect(container.querySelector('#exam-layout-popup')).toBeNull();
  await click('Clear patient');
  expect(container.querySelector('#exam-layout-popup').checked).toBe(false);
  await click('New patient');
  await click('Start Recording');
  expect(JSON.parse(localStorage.getItem('noteSettings')).examLayout).toBe(true);
  await act(async () => root.render(null));
  await act(async () => root.render(<Recording startRecording={startRecording} />));
  expect(container.querySelector('#exam-layout-popup').checked).toBe(false);
  expect(container.querySelector('#pi-layout-popup').checked).toBe(true);
});

test('unassigned confirmation preserves unchecked PI independently of Exam Layout', async () => {
  await act(async () => container.querySelector('#pi-layout-popup').click());
  await click('Type patient name');
  await click('Start Recording');
  expect(container.querySelectorAll('#exam-layout-popup')).toHaveLength(1);
  await click('Record without a patient');
  expect(JSON.parse(localStorage.getItem('noteSettings'))).toMatchObject({ examLayout: true, PILayout: false });
});


test('disabled patient capture preserves legacy exam settings and starts without patient metadata', async () => {
  mockPatientCaptureEnabled = false;
  await act(async () => root.render(<Recording startRecording={startRecording} />));
  expect(container.textContent).not.toContain('Existing patient');
  expect(container.querySelector('#re-exam-popup')).toBeNull();
  const exam = container.querySelector('#exam-layout-popup');
  expect(exam.checked).toBe(true);
  await click('Start Recording');
  expect(startRecording).toHaveBeenLastCalledWith(undefined);
  expect(exam.disabled).toBe(false);
  expect(JSON.parse(localStorage.getItem('noteSettings'))).toMatchObject({ examLayout: true, PILayout: true });
  await act(async () => exam.click());
  await click('Start Recording');
  expect(JSON.parse(localStorage.getItem('noteSettings'))).toMatchObject({ examLayout: false, PILayout: true });
});
