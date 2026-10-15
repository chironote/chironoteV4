import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RecordingManager from './RecordingManager';

const mockStartRecorder = jest.fn();
let mockCaptureRef;
jest.mock('nosleep.js', () => class NoSleep { disable() {} });
jest.mock('aws-amplify/api', () => ({ generateClient: jest.fn() }));
jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn() }));
jest.mock('../../services/patientNotes', () => {
  const previous = process.env.REACT_APP_PATIENT_NOTES_ENABLED;
  const previousCapture = process.env.REACT_APP_PATIENT_CAPTURE_ENABLED;
  process.env.REACT_APP_PATIENT_NOTES_ENABLED = 'true';
  process.env.REACT_APP_PATIENT_CAPTURE_ENABLED = 'true';
  const service = jest.requireActual('../../services/patientNotes');
  if (previous === undefined) delete process.env.REACT_APP_PATIENT_NOTES_ENABLED;
  else process.env.REACT_APP_PATIENT_NOTES_ENABLED = previous;
  if (previousCapture === undefined) delete process.env.REACT_APP_PATIENT_CAPTURE_ENABLED;
  else process.env.REACT_APP_PATIENT_CAPTURE_ENABLED = previousCapture;
  return service;
});
jest.mock('./useNoteGeneration', () => ({ __esModule: true, default: ({ captureRef }) => {
  mockCaptureRef = captureRef;
  return { cleanupNoteGeneration: jest.fn() };
} }));
jest.mock('./useAudioUploadQueue', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('./useMediaRecorderController', () => ({ __esModule: true, default: () => ({
  startRecording: mockStartRecorder,
  cleanupRecorder: jest.fn(),
  isRecordingRef: { current: false },
  isPausedRef: { current: false }
}) }));

global.IS_REACT_ACT_ENVIRONMENT = true;
let root, api;
function Harness() { api = RecordingManager({}); return null; }
beforeEach(() => {
  root = createRoot(document.createElement('div'));
  mockStartRecorder.mockReset();
  act(() => root.render(<Harness />));
});
afterEach(() => { act(() => root.unmount()); localStorage.clear(); });

test.each([true, false])('settings snapshot precedes microphone acquisition and retains exam=%s independently of later changes', examLayout => {
  localStorage.setItem('noteSettings', JSON.stringify({ examLayout, PILayout: true, manualExamLayout: !examLayout }));
  mockStartRecorder.mockImplementation(() => {
    expect(mockCaptureRef.current.noteSettings).toEqual({ examLayout, PILayout: true });
  });
  const metadata = { patientId: null, visitType: null };
  api.startRecording(metadata);
  const capture = mockCaptureRef.current;
  metadata.visitType = 'reExam';
  localStorage.setItem('noteSettings', JSON.stringify({ examLayout: !examLayout, PILayout: false }));
  expect(capture.noteSettings).toEqual({ examLayout, PILayout: true });
  expect(capture.visitMetadata.visitType).toBeNull();
  expect(Object.isFrozen(capture)).toBe(true);
  expect(Object.isFrozen(capture.noteSettings)).toBe(true);
  expect(Object.isFrozen(capture.visitMetadata)).toBe(true);
  expect(mockStartRecorder).toHaveBeenCalledTimes(1);
});
