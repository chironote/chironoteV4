import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Recording from './Recording';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

const mockGraphql = jest.fn();

jest.mock('aws-amplify/auth', () => ({ getCurrentUser: jest.fn(), fetchAuthSession: jest.fn() }));
jest.mock('aws-amplify/api', () => ({ generateClient: () => ({ graphql: (...args) => mockGraphql(...args) }) }));
jest.mock('../../utils/analytics', () => ({ trackRecordingStart: jest.fn() }));
jest.mock('../../services/patientNotes', () => ({ patientCaptureEnabled: true, localDate: () => '2026-10-11' }));
jest.mock('../Patients/PatientCapturePicker', () => ({ value, onChange }) => <div>
  <button onClick={() => onChange({ ...value, patientId: 'existing', patientName: undefined, visitType: 'followUp' })}>Existing patient</button>
  <button onClick={() => onChange({ ...value, patientId: 'new', patientName: 'New Example', visitType: 'initialExam' })}>New patient</button>
  <button onClick={() => onChange({ ...value, patientId: null, patientName: undefined, visitType: null })}>Clear patient</button>
</div>);

global.IS_REACT_ACT_ENVIRONMENT = true;
let container, root, startRecording;
beforeEach(async () => {
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
