import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useNoteGeneration from './useNoteGeneration';
import { patientRequest } from '../../services/patientNotes';
jest.mock('aws-amplify/api', () => ({ generateClient: () => ({ graphql: jest.fn() }) }));
jest.mock('./recordingAuth', () => ({ generateToken: async () => 'synthetic', getUserId: async () => 'synthetic-owner' }));
jest.mock('../../services/patientNotes', () => ({ patientNotesEnabled: true, patientRequest: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let root, container, api, props;
function Harness() { api = useNoteGeneration(props); return null; }
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  props = { timeStampRef: { current: '123' }, captureRef: { current: { userId: 'synthetic-owner', noteSettings: { examLayout: true } } },
    isDiscardingRef: { current: false }, noSleepRef: { current: { disable: jest.fn() } },
    ...Object.fromEntries(['setTextStream','setIsPreparingTranscript','setIsGeneratingSummary','setIsTranscriptCompleted','onTextStreamUpdate','onTransitionToMainApp','onSavedNoteReady','onGenerationError'].map(key => [key,jest.fn()])) };
  patientRequest.mockReset(); jest.spyOn(console,'warn').mockImplementation(()=>{});
  global.fetch = jest.fn().mockResolvedValue({ ok:true, headers:{get:()=> 'text/plain'}, body:{getReader:()=>({
    read:jest.fn().mockResolvedValueOnce({done:false,value:new TextEncoder().encode('Synthetic unsaved preview')}).mockResolvedValue({done:true}),cancel:jest.fn() })} });
  act(()=>root.render(<Harness/>));
});
afterEach(()=>{ api.cleanupNoteGeneration(); act(()=>root.unmount()); container.remove(); jest.restoreAllMocks(); });
test('EOF uses the exact durable note, never the generated preview, for the editable baseline', async()=>{
  const saved = {timestamp:'123',version:'saved-version',ready:true,note:'Exact saved clinical body'};
  patientRequest.mockResolvedValue({note:saved});
  await act(async()=>api.streamResponse());
  expect(patientRequest).toHaveBeenCalledWith('getSavedNote',{timestamp:'123'});
  expect(props.onSavedNoteReady).toHaveBeenCalledWith(saved);
  expect(props.onTextStreamUpdate).toHaveBeenLastCalledWith(saved.note);
});
test('incomplete durable state preserves the generated preview and reports that it was not saved',async()=>{
  patientRequest.mockResolvedValue({note:{ready:false,note:''}});
  await act(async()=>api.streamResponse());
  expect(props.onSavedNoteReady).not.toHaveBeenCalled();
  expect(props.onTextStreamUpdate).toHaveBeenLastCalledWith('Synthetic unsaved preview');
  expect(props.onGenerationError).toHaveBeenLastCalledWith(expect.stringContaining('preview was not saved'));
});
test('a saved-note response arriving after cancellation cannot replace a newer workspace',async()=>{
  let resolveRead; patientRequest.mockImplementation(()=>new Promise(resolve=>{resolveRead=resolve;}));
  let request;
  await act(async()=>{ request=api.streamResponse(); for(let i=0;i<8;i++) await Promise.resolve(); });
  expect(resolveRead).toBeDefined(); api.cleanupNoteGeneration();
  await act(async()=>{resolveRead({note:{ready:true,note:'Late saved body'}});await request;});
  expect(props.onSavedNoteReady).not.toHaveBeenCalled();
  expect(props.onTextStreamUpdate).toHaveBeenLastCalledWith('Synthetic unsaved preview');
});
