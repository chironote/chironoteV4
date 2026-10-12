import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import MainWorkspace from './MainWorkspace';
import { patientRequest } from '../../services/patientNotes';
jest.mock('../Recording/Recording', () => () => null);
jest.mock('../Recording/DictationPopup', () => () => null);
jest.mock('../Clipboard/Clipboard', () => () => null);
jest.mock('../Sidebar/EditPanel', () => () => <section aria-label="Smart Editor" />);
jest.mock('../Sidebar/HistorySidebar', () => () => null);
jest.mock('../Sidebar/MobileHistoryToggle', () => () => null);
jest.mock('../../services/patientNotes', () => ({ patientNotesEnabled: true, patientRequest: jest.fn(async () => ({ patient: { name: 'Jordan Example' } })) }));
jest.mock('../../utils/analytics', () => ({ trackDictationStart: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let root, container;
beforeEach(() => { patientRequest.mockResolvedValue({ patient: { name: 'Jordan Example' } }); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
function Harness({ patientId, save, phoneLayout = false, nativeLayout = false, smartEditorAvailable = !phoneLayout }) {
  const [showNotes, setShowNotes] = useState(true), [menu, setMenu] = useState(false);
  return <MainWorkspace phoneLayout={phoneLayout} nativeLayout={nativeLayout} smartEditorAvailable={smartEditorAvailable} user={{ username: 'synthetic' }} notesHistory={{}} sidebar={{}} editPanel={{}}
    clipboard={{ save }} recording={{ manager: {} }} dictation={{ main: {}, edit: {} }}
    contentPopup={{ showContentPopup: true, selectedItem: { note: 'Subjective: Synthetic note', transcript: 'Doctor: Synthetic transcript', patientId, visitLabel: 'Visit label' }, selectedContent: showNotes ? 'Subjective: Synthetic note' : 'Doctor: Synthetic transcript', selectedTimestamp: '1791670000000', showNotes, showPopupMenu: menu, togglePopupMenu: () => setMenu(!menu), handlePopupViewModeChange: mode => { setShowNotes(mode === 'note'); setMenu(false); } }} />;
}
test.each([undefined, 'patient-1'])('History restores the original popup and transcript for patient %s', async patientId => {
  await act(async () => root.render(<Harness patientId={patientId} />));
  expect(container.querySelector('.content-popup')).not.toBeNull();
  expect(container.querySelector('.patient-note-editor')).toBeNull();
  expect(container.querySelector('.label-container').previousElementSibling.textContent).toBe(patientId ? 'Jordan Example' : 'Unassigned');
  expect(container.querySelector('.label-title').textContent).toBe('Visit label');
  await act(async () => container.querySelector('[aria-label="More options"]').click());
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'View Transcript').click());
  expect(container.querySelector('.content-popup-text').textContent).toContain('Doctor: Synthetic transcript');
  await act(async () => container.querySelector('[aria-label="More options"]').click());
  await act(async () => [...container.querySelectorAll('button')].find(b => b.textContent === 'View Note').click());
  expect(container.querySelector('.content-popup-text').textContent).toContain('Synthetic note');
});
test('the icon-only Save follows Edit and exposes dirty, saving and disabled states', async () => {
  const onSave = jest.fn();
  const save = { visible: true, dirty: true, onSave };
  await act(async () => root.render(<Harness save={save} />));
  const button = container.querySelector('#save-note-btn');
  const divider = container.querySelector('#edit-panel-btn').nextElementSibling;
  expect(divider.classList.contains('toolbar-divider')).toBe(true);
  expect(divider.nextElementSibling).toBe(button);
  expect(button.textContent).toBe('save');
  expect(button.getAttribute('aria-label')).toBe('Save note changes');
  await act(async () => button.click()); expect(onSave).toHaveBeenCalledTimes(1);
  await act(async () => root.render(<Harness save={{ ...save, busy: true }} />));
  expect(button.disabled).toBe(true); expect(button.getAttribute('aria-label')).toBe('Saving note');
  await act(async () => root.render(<Harness save={{ visible: false }} />));
  expect(container.querySelector('#save-note-btn')).toBeNull();
  expect(container.querySelector('#edit-panel-btn').nextElementSibling).toBeNull();
});

test.each(['portrait', 'landscape'])('phone %s omits Smart Editor while retaining independent Save', async () => {
  const onSave = jest.fn();
  await act(async () => root.render(<Harness phoneLayout save={{ visible: true, dirty: true, onSave }} />));
  expect(container.querySelector('#edit-panel-btn')).toBeNull();
  expect(container.querySelector('[aria-label="Smart Editor"]')).toBeNull();
  expect(container.querySelector('#new-note-btn').textContent).toContain('New Note');
  const save = container.querySelector('#save-note-btn');
  expect(save.disabled).toBe(false);
  await act(async () => save.click());
  expect(onSave).toHaveBeenCalledTimes(1);
  await act(async () => root.render(<Harness phoneLayout save={{ visible: true, busy: true, onSave }} />));
  expect(save.disabled).toBe(true);
  expect(save.getAttribute('aria-label')).toBe('Saving note');
  await act(async () => root.render(<Harness phoneLayout save={{ visible: true, dirty: false, disabled: true, onSave }} />));
  expect(save.disabled).toBe(true);
  expect(save.getAttribute('aria-label')).toBe('Note saved');
  await act(async () => root.render(<Harness phoneLayout save={{ visible: false }} />));
  expect(container.querySelector('#save-note-btn')).toBeNull();
  expect(container.querySelector('.toolbar-edit-actions')).toBeNull();
});

test('native tablet omits editor and preserves independent Save without phone styling', async () => {
  const onSave = jest.fn();
  await act(async () => root.render(<Harness nativeLayout smartEditorAvailable={false} save={{ visible: true, dirty: true, onSave }} />));
  expect(container.querySelector('#edit-panel-btn')).toBeNull();
  expect(container.querySelector('[aria-label="Smart Editor"]')).toBeNull();
  expect(container.querySelector('.toolbar-edit-actions')).toBeNull();
  expect(container.querySelector('.clipboard-container').classList.contains('clipboard-phone-layout')).toBe(false);
  expect(container.querySelector('.clipboard-container').classList.contains('clipboard-native-layout')).toBe(true);
  await act(async () => container.querySelector('#save-note-btn').click());
  expect(onSave).toHaveBeenCalledTimes(1);
});
