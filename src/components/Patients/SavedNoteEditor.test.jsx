import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SavedNoteEditor from './SavedNoteEditor';
import { patientRequest } from '../../services/patientNotes';
import { leaveDrafts, hasUnsavedDraft } from './draftNavigation';
jest.mock('../../services/patientNotes', () => ({ patientRequest: jest.fn(), localDate: () => '2026-10-10' }));
global.IS_REACT_ACT_ENVIRONMENT = true;
const original = { timestamp: '100', note: 'Assessment: original', version: 'v1', ready: true };
let root, container;
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);
const edit = async text => {
  await act(async () => {
    const area = container.querySelector('textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(area, text);
    area.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
beforeEach(async () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'request-123' } });
  patientRequest.mockReset(); patientRequest.mockImplementation(async operation => operation === 'getSavedNote' ? { note: original } : {});
  await act(async () => root.render(<SavedNoteEditor timestamp="100" desktopSave />)); await flush();
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

test('navigation offers three choices and Keep editing preserves the exact draft', async () => {
  await edit('Assessment: exact unsaved draft  ');
  expect(hasUnsavedDraft()).toBe(true);
  const next = jest.fn(); let leaving;
  act(() => { leaving = leaveDrafts(next); });
  expect(button('Save and continue')).toBeTruthy(); expect(button('Discard changes')).toBeTruthy();
  await act(async () => button('Keep editing').click());
  expect(await leaving).toBe(false); expect(next).not.toHaveBeenCalled();
  expect(container.querySelector('textarea').value).toBe('Assessment: exact unsaved draft  ');
});

test('failed Save and continue cannot navigate or erase the draft', async () => {
  await edit('Assessment: failed draft');
  patientRequest.mockImplementation(async operation => { if (operation === 'saveNote') throw new Error('Connection failed'); return { note: original }; });
  const next = jest.fn(); act(() => { void leaveDrafts(next); });
  await act(async () => button('Save and continue').click()); await flush();
  expect(next).not.toHaveBeenCalled(); expect(hasUnsavedDraft()).toBe(true);
  expect(container.querySelector('textarea').value).toBe('Assessment: failed draft');
  expect(container.textContent).toContain('Connection failed');
});

test('diagnosis confirmation delays navigation until the exact draft is saved', async () => {
  const text = 'Assessment: revised  '; await edit(text);
  patientRequest.mockImplementation(async (operation, input) => operation === 'saveNote'
    ? input.confirmationToken ? { status: 'SAVED', note: { ...original, note: input.note, version: 'v2' } }
      : { status: 'CONFIRMATION_REQUIRED', icdCodes: [], establishesSet: true, confirmationToken: 'confirmed' }
    : { note: original });
  const next = jest.fn(); let leaving; act(() => { leaving = leaveDrafts(next); });
  await act(async () => button('Save and continue').click()); await flush();
  expect(next).not.toHaveBeenCalled();
  await act(async () => button('Confirm and save').click()); await flush();
  expect(await leaving).toBe(true); expect(next).toHaveBeenCalledTimes(1);
  expect(patientRequest).toHaveBeenLastCalledWith('saveNote', expect.objectContaining({ note: text, confirmationToken: 'confirmed', expectedVersion: 'v1' }));
});

test('native/mobile mode does not expose the desktop Save workflow', async () => {
  await act(async () => root.render(<SavedNoteEditor timestamp="100" desktopSave={false} />));
  expect(container.querySelector('textarea')).toBeNull(); expect(button('Save note')).toBeUndefined();
});
