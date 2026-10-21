import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthenticatedApp from './AuthenticatedApp';
import { patientRequest } from '../../services/patientNotes';

jest.mock('../../services/patientNotes', () => ({ patientNotesEnabled: true, patientRequest: jest.fn(), localDate: () => '2026-10-11' }));
jest.mock('../Patients/useDesktopSave', () => () => true);
jest.mock('aws-amplify/auth', () => ({ fetchUserAttributes: jest.fn() }));
jest.mock('react-helmet-async', () => ({ Helmet: () => null }));
jest.mock('../Billing/Billing', () => () => null);
jest.mock('../Billing/PriceTable', () => () => null);
jest.mock('../Settings/Settings', () => () => null);
jest.mock('../Feedback/Feedback', () => () => null);
jest.mock('../IntroTour/IntroTour', () => () => null);
let mockRecordingCallbacks;
jest.mock('../Recording/RecordingManager', () => callbacks => { mockRecordingCallbacks = callbacks; return {}; });
jest.mock('../Recording/Dictation', () => () => ({}));
jest.mock('./useUserAnalytics', () => () => {});
jest.mock('./useNotesHistory', () => () => ({ refreshNotes: jest.fn() }));
jest.mock('../../services/amplifyClient', () => ({ getAmplifyClient: jest.fn() }));
jest.mock('../../utils/analytics', () => ({ trackRecordingCompleted: jest.fn() }));
jest.mock('../Navbar/Navbar', () => () => null);
let mockContentPopup;
jest.mock('./MainWorkspace', () => ({ clipboard, sidebar, contentPopup }) => {
  mockContentPopup = contentPopup;
  const Clipboard = jest.requireActual('../Clipboard/Clipboard').default;
  const HistoryListItem = jest.requireActual('../Sidebar/HistoryListItem').default;
  return <main>
  <h2>Your Clipboard</h2><span>{clipboard.target?.timestamp}</span>
  <div data-testid="mobile-drop" onDrop={sidebar.onMobileOverlayDrop} />
  <span>{clipboard.target?.patientId} {clipboard.target?.version}</span>
  <HistoryListItem item={{ timestamp: '456', note: 'Stale history body', visitLabel: 'Dragged visit' }} onDragStart={() => {}} onClick={() => {}} />
  <button disabled={clipboard.save.disabled || clipboard.save.busy} onClick={clipboard.save.onSave}>Save note</button>
  {clipboard.review}<Clipboard clipboardTextareaRef={clipboard.clipboardTextareaRef} clipboardContent={clipboard.clipboardContent}
    setClipboardContent={clipboard.setClipboardContent} onSavedNoteDrop={clipboard.onSavedNoteDrop} onTextDrop={clipboard.onTextDrop} isDisabled={clipboard.save.busy} />
</main>;
});

global.IS_REACT_ACT_ENVIRONMENT = true;
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
test.each(['initialExam', 'followUp', 'reExam'])('Patients opens %s in clipboard and saves changed codes without status controls', async visitType => {
  patientRequest.mockClear();
  jest.useFakeTimers();
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'synthetic-request' } });
  const patient = { patientId: 'synthetic', name: 'Jordan Example', visitCount: 1 };
  let saved = { timestamp: '123', version: 'v1', patientId: patient.patientId, visitType, visitLabel: 'Initial visit', dateOfService: '2026-10-01',
    note: 'Subjective: Synthetic fixture.\nAssessment:\nM54.2 — Cervicalgia\nPlan: Recheck.', diagnosisState: { icdCodes: [{ code: 'M54.2', description: 'Cervicalgia', status: 'new' }] } };
  patientRequest.mockImplementation(async (operation, input) => {
    if (operation === 'listPatients') return { items: [patient] };
    if (operation === 'getPatientVisits') return { patient, notes: [{ ...saved, note: 'Display-only row must not be used as the draft' }] };
    if (operation === 'getPatient') return { patient };
    if (operation === 'getSavedNote') return { note: saved };
    if (operation === 'saveNote') {
      expect(input.expectedVersion).toBe(saved.version);
      saved = { ...saved, version: 'v2', note: input.note, diagnosisState: { icdCodes: input.diagnosisCodes } };
      return { status: 'SAVED', note: saved };
    }
    throw new Error(`Unexpected ${operation}`);
  });
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  const click = async text => act(async () => [...container.querySelectorAll('button')].find(node => node.textContent.includes(text)).click());
  await act(async () => root.render(<MemoryRouter initialEntries={['/app/patients']}><Routes><Route path="/app/*" element={<AuthenticatedApp user={{ username: 'synthetic' }} />} /></Routes></MemoryRouter>));
  await act(async () => jest.advanceTimersByTime(250));
  await click('Jordan Example'); await click('Initial visit');
  expect(container.textContent).toContain('Your Clipboard');
  expect(container.querySelector('.patient-note-editor')).toBeNull();
  expect(container.querySelector('textarea').value).toBe(saved.note);
  const corrected = saved.note.replace('Plan:', 'M99.01 — Segmental and somatic dysfunction of cervical region\nPlan:');
  await act(async () => {
    const area = container.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, corrected);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await click('Save note');
  expect(container.textContent).toContain('Confirm diagnosis changes');
  expect(container.querySelector('.clipboard-save-review select')).toBeNull();
  expect(container.textContent).not.toMatch(/Choose status|Continuing|Status not recorded/);
  expect(patientRequest.mock.calls.filter(([op]) => op === 'saveNote')).toHaveLength(0);
  await click('Confirm and save');
  expect(saved.note).toBe(corrected);
  expect(saved.diagnosisState.icdCodes).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'M99.01', status: 'new' })]));
  expect(saved.patientId).toBe('synthetic'); expect(saved.dateOfService).toBe('2026-10-01');
  expect(container.querySelector('.clipboard-save-review')).toBeNull();
  expect([...container.querySelectorAll('button')].find(node => node.textContent === 'Save note').disabled).toBe(true);
  act(() => root.unmount()); container.remove(); jest.useRealTimers();
});

describe('saved-note drops', () => {
  let container, root, saved, pendingSave;
  const first = { timestamp: '123', version: 'v1', note: 'Subjective: First fictional visit.', patientId: 'fictional-a' };
  const second = { timestamp: '456', version: 'v3', note: 'Subjective: Current fictional visit.', patientId: 'fictional-b', dateOfService: '2026-10-01' };
  const click = async text => act(async () => [...container.querySelectorAll('button')].find(node => node.textContent.includes(text)).click());
  const drop = async (timestamp, text = 'Stale history body', selector = 'textarea') => {
    const values = { 'text/plain': text };
    if (timestamp) values['application/x-chironote-saved-note'] = timestamp;
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { getData: type => values[type] || '' } });
    await act(async () => container.querySelector(selector).dispatchEvent(event));
  };
  const edit = async text => act(async () => {
    const area = container.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, text);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
  beforeEach(async () => {
    jest.clearAllMocks(); saved = { ...first }; pendingSave = null;
    patientRequest.mockImplementation(async (operation, input) => {
      if (operation === 'getSavedNote') return { note: input.timestamp === '123' ? saved : second };
      if (operation === 'saveNote') {
        if (pendingSave) await pendingSave;
        saved = { ...saved, note: input.note, version: 'v2' };
        return { status: 'SAVED', note: saved };
      }
      if (operation === 'getPatient') return { patient: { name: 'Fictional Patient' } };
      throw new Error(`Unexpected ${operation}`);
    });
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => root.render(<MemoryRouter initialEntries={['/app']}><Routes><Route path="/app/*" element={<AuthenticatedApp user={{ username: 'synthetic' }} />} /></Routes></MemoryRouter>));
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  test('authoritative recovered Markdown body becomes the exact clean editable baseline', async () => {
    const recovered = { ...first, version: 'recovered-version', note: '**Subjective:** Synthetic recovered result.' };
    await act(async () => {
      mockRecordingCallbacks.onTextStreamUpdate(recovered.note);
      mockRecordingCallbacks.onSavedNoteReady(recovered);
    });
    expect(container.querySelector('textarea').value).toBe(recovered.note);
    expect(container.textContent).toContain('recovered-version');
    expect([...container.querySelectorAll('button')].find(node => node.textContent === 'Save note').disabled).toBe(true);
  });
  test('history popup cannot replace the clipboard while generation is active', async () => {
    await drop('123');
    await act(async () => mockRecordingCallbacks.onGenerationStateChange(true));
    await act(async () => mockContentPopup.handleSendToClipboard());
    expect(container.querySelector('textarea').value).toBe(first.note);
    expect(container.textContent).toContain('fictional-a v1');
  });
  test('History carries saved identity plus external text and drop reloads the current version', async () => {
    const values = {};
    const event = new Event('dragstart', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', { value: { setData: (type, value) => { values[type] = value; } } });
    await act(async () => container.querySelector('.list-item').dispatchEvent(event));
    expect(values).toEqual({ 'text/plain': 'Stale history body', 'application/x-chironote-saved-note': '456' });
    await drop(values['application/x-chironote-saved-note'], values['text/plain']);
    expect(container.querySelector('textarea').value).toBe(second.note);
    expect(container.textContent).toContain('fictional-b v3');
    await edit('Subjective: Edited fictional visit.'); await click('Save note');
    expect(patientRequest).toHaveBeenCalledWith('saveNote', expect.objectContaining({ timestamp: '456', expectedVersion: 'v3', note: 'Subjective: Edited fictional visit.' }));
  });
  test.each(['Keep editing', 'Discard changes', 'Save and continue'])('%s uses the existing draft guard', async choice => {
    await drop('123'); await edit('Subjective: Unsaved fictional draft.'); await drop('456');
    expect(container.textContent).toContain('Save this draft before continuing?');
    expect(container.querySelector('textarea').value).toBe('Subjective: Unsaved fictional draft.');
    await click(choice);
    expect(container.querySelector('textarea').value).toBe(choice === 'Keep editing' ? 'Subjective: Unsaved fictional draft.' : second.note);
    expect(patientRequest.mock.calls.filter(([op]) => op === 'saveNote')).toHaveLength(choice === 'Save and continue' ? 1 : 0);
  });
  test('failed fetch preserves the loaded target and draft without using stale plain text', async () => {
    await drop('123'); await edit('Subjective: Unsaved fictional draft.');
    patientRequest.mockRejectedValueOnce(new Error('Missing saved record'));
    await drop('456');
    expect(container.querySelector('textarea').value).toBe('Subjective: Unsaved fictional draft.');
    expect(container.textContent).toContain('fictional-a v1');
    expect(container.textContent).toContain('The saved note could not be opened');
  });
  test('drops during a pending save cannot replace its draft or target', async () => {
    await drop('123'); await edit('Subjective: Saving fictional draft.');
    let finish; pendingSave = new Promise(resolve => { finish = resolve; });
    await click('Save note');
    const calls = patientRequest.mock.calls.length;
    await drop('456');
    expect(patientRequest.mock.calls).toHaveLength(calls);
    expect(container.querySelector('textarea').value).toBe('Subjective: Saving fictional draft.');
    await act(async () => finish());
  });
  test('external text remains a deliberate text replacement and an edit of the loaded note', async () => {
    await drop('123'); await drop(null, 'Subjective: External fictional text.');
    expect(container.querySelector('textarea').value).toBe('Subjective: External fictional text.');
    expect(container.textContent).toContain('fictional-a v1');
    await click('Save note');
    expect(patientRequest).toHaveBeenCalledWith('saveNote', expect.objectContaining({ timestamp: '123', expectedVersion: 'v1', note: 'Subjective: External fictional text.' }));
  });
  test('mobile history overlay uses the same saved-note route', async () => {
    await drop('456', 'Stale history body', '[data-testid="mobile-drop"]');
    expect(container.querySelector('textarea').value).toBe(second.note);
    expect(container.textContent).toContain('fictional-b v3');
  });
  test.each(['saved', 'external'])('a later %s drop supersedes an in-flight fetch', async kind => {
    let finish;
    patientRequest.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await drop('123');
    if (kind === 'saved') await drop('456');
    else await drop(null, 'Later external fictional text');
    await act(async () => finish({ note: first }));
    expect(container.querySelector('textarea').value).toBe(kind === 'saved' ? second.note : 'Later external fictional text');
  });
});

test.each([false, true])('an older patient lookup cannot replace generation, finished=%s', async finished => {
  jest.useFakeTimers();
  const patient={patientId:'synthetic',name:'Jordan Example'};
  const note={timestamp:'123',version:'v1',note:'Synthetic saved body',visitLabel:'Initial visit',patientId:patient.patientId};
  let finishRead; let delay=true;
  patientRequest.mockImplementation(async op=>op==='listPatients'?{items:[patient]}:op==='getPatientVisits'?{patient,notes:[note]}:op==='getSavedNote'?(delay?new Promise(resolve=>{finishRead=resolve;}):{note}):{patient});
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  await act(async()=>root.render(<MemoryRouter initialEntries={['/app/patients']}><Routes><Route path="/app/*" element={<AuthenticatedApp user={{username:'synthetic'}}/>}/></Routes></MemoryRouter>));
  await act(async()=>jest.advanceTimersByTime(250));
  const click=async text=>act(async()=>[...container.querySelectorAll('button')].find(node=>node.textContent.includes(text)).click());
  await click('Jordan Example'); await click('Initial visit'); expect(finishRead).toBeDefined();
  await act(async()=>mockRecordingCallbacks.onGenerationStateChange(true));
  if(finished)await act(async()=>mockRecordingCallbacks.onGenerationStateChange(false));
  await act(async()=>finishRead({note}));expect(container.textContent).not.toContain('Your Clipboard');
  delay=false;
  await act(async()=>mockRecordingCallbacks.onGenerationStateChange(false));
  await click('Initial visit');expect(container.querySelector('textarea').value).toBe(note.note);
  act(()=>root.unmount());container.remove();jest.useRealTimers();
});
