import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import SavedNoteEditor from './SavedNoteEditor';
import { patientRequest } from '../../services/patientNotes';
import { leaveDrafts, hasUnsavedDraft } from './draftNavigation';
jest.mock('../../services/patientNotes', () => ({ patientRequest: jest.fn(), localDate: () => '2026-10-10' }));
global.IS_REACT_ACT_ENVIRONMENT = true;
const original = { timestamp: '100', note: 'Assessment: original', version: 'v1', ready: true };
const diagnosisNote = {
  ...original,
  note: 'Assessment: M54.5; M54.50 is a different code. Recheck M54.5.',
  diagnosisState: { icdCodes: [{ code: 'M54.5', description: 'Lumbar pain', status: 'continuing' }] },
};
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
const setField = async (label, value) => {
  await act(async () => {
    const field = container.querySelector(`[aria-label="${label}"]`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const click = async text => act(async () => button(text).click());
const renderDiagnosisNote = async note => {
  await act(async () => root.render(<SavedNoteEditor timestamp="100" desktopSave initialNote={note} />));
  await flush();
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

test('applies exact code replacements, previews the note, and saves body plus diagnosis state atomically', async () => {
  await renderDiagnosisNote(diagnosisNote);
  await setField('Replacement code for M54.5', 'm54.50');
  await setField('Replacement description for M54.5', 'Low back pain, unspecified');
  expect(button('Save note').disabled).toBe(true);
  await click('Apply code correction');

  const expectedNote = 'Assessment: M54.50; M54.50 is a different code. Recheck M54.50.';
  const expectedCodes = [{ code: 'M54.50', description: 'Low back pain, unspecified', status: 'continuing' }];
  expect(container.querySelector('textarea').value).toBe(expectedNote);
  expect(container.querySelector('.patient-diagnosis-preview pre').textContent).toBe(expectedNote);
  expect(container.textContent).toContain('Continuing');

  patientRequest.mockImplementation(async (operation, input) => {
    if (operation === 'saveNote') return { note: { ...diagnosisNote, note: input.note, version: 'v2', diagnosisState: { icdCodes: input.diagnosisCodes } } };
    return { note: diagnosisNote };
  });
  await click('Save note'); await flush();
  expect(patientRequest).toHaveBeenLastCalledWith('saveNote', expect.objectContaining({
    timestamp: '100', note: expectedNote, expectedVersion: 'v1', requestId: 'request-123', diagnosisCodes: expectedCodes,
  }));
  expect(container.querySelector('textarea').value).toBe(expectedNote);
  expect(button('Save note').disabled).toBe(true);
});

test('omits unknown status for an unchanged legacy code when saving another correction', async () => {
  const legacyNote = {
    ...diagnosisNote,
    note: 'Assessment: M54.5 and M25.511.',
    diagnosisState: { icdCodes: [
      { code: 'M54.5', description: 'Lumbar pain', status: 'continuing' },
      { code: 'M25.511', description: 'Shoulder pain' },
    ] },
  };
  await renderDiagnosisNote(legacyNote);
  await setField('Replacement code for M54.5', 'M54.6');
  await setField('Replacement description for M54.5', 'Alternate lumbar diagnosis');
  await click('Apply code correction');
  const savedNote = { ...legacyNote, note: 'Assessment: M54.6 and M25.511.', version: 'v2', diagnosisState: { icdCodes: [
    { code: 'M54.6', description: 'Alternate lumbar diagnosis', status: 'continuing' },
    { code: 'M25.511', description: 'Shoulder pain' },
  ] } };
  patientRequest.mockImplementation(async (operation, input) => operation === 'saveNote' ? { note: savedNote } : { note: legacyNote });
  await click('Save note'); await flush();

  expect(patientRequest).toHaveBeenLastCalledWith('saveNote', expect.objectContaining({
    note: savedNote.note,
    diagnosisCodes: [
      { code: 'M54.6', description: 'Alternate lumbar diagnosis', status: 'continuing' },
      { code: 'M25.511', description: 'Shoulder pain' },
    ],
  }));
  expect(patientRequest.mock.calls[patientRequest.mock.calls.length - 1][1].diagnosisCodes[1]).not.toHaveProperty('status');
});

test('blocks invalid codes and collisions without changing either draft', async () => {
  const withCollision = { ...diagnosisNote, diagnosisState: { icdCodes: [
    ...diagnosisNote.diagnosisState.icdCodes,
    { code: 'M54.50', description: 'Other lumbar diagnosis', status: 'new' },
  ] } };
  await renderDiagnosisNote(withCollision);
  await setField('Replacement code for M54.5', 'M54.');
  await click('Apply code correction');
  expect(container.textContent).toContain('Enter a complete ICD code');
  expect(container.querySelector('textarea').value).toBe(diagnosisNote.note);
  expect(container.textContent).toContain('M54.5 — Lumbar pain');

  await setField('Replacement code for M54.5', 'M54.50');
  await setField('Replacement description for M54.5', 'Corrected description');
  await click('Apply code correction');
  expect(container.textContent).toContain('already in this visit’s diagnosis list');
  expect(container.querySelector('textarea').value).toBe(diagnosisNote.note);
  expect(container.textContent).toContain('M54.5 — Lumbar pain');
});

test('blocks partial-prefix-only matches and tells the clinician to edit the note manually', async () => {
  const partialOnly = { ...diagnosisNote, note: 'Assessment: M54.50 only.' };
  await renderDiagnosisNote(partialOnly);
  await setField('Replacement code for M54.5', 'M54.6');
  await setField('Replacement description for M54.5', 'Alternate lumbar diagnosis');
  await click('Apply code correction');
  expect(container.textContent).toContain('only inside a longer code token');
  expect(container.querySelector('textarea').value).toBe(partialOnly.note);
  expect(container.textContent).toContain('M54.5 — Lumbar pain');
});

test('a save conflict preserves the corrected code and complete note draft', async () => {
  await renderDiagnosisNote(diagnosisNote);
  await setField('Replacement code for M54.5', 'M54.6');
  await setField('Replacement description for M54.5', 'Alternate lumbar diagnosis');
  await click('Apply code correction');
  const expectedNote = 'Assessment: M54.6; M54.50 is a different code. Recheck M54.6.';
  patientRequest.mockImplementation(async (operation, input) => {
    if (operation === 'saveNote') throw new Error('The saved note changed. Reload and review this draft.');
    return { note: diagnosisNote };
  });
  await click('Save note'); await flush();
  expect(hasUnsavedDraft()).toBe(true);
  expect(container.querySelector('textarea').value).toBe(expectedNote);
  expect(container.textContent).toContain('M54.6 — Alternate lumbar diagnosis');
  expect(container.textContent).toContain('The saved note changed');
  expect(patientRequest).toHaveBeenLastCalledWith('saveNote', expect.objectContaining({
    note: expectedNote, expectedVersion: 'v1', diagnosisCodes: [{ code: 'M54.6', description: 'Alternate lumbar diagnosis', status: 'continuing' }],
  }));
});

test('mobile displays diagnosis status without exposing correction fields or persistent Save', async () => {
  await act(async () => root.render(<SavedNoteEditor timestamp="100" desktopSave={false} initialNote={diagnosisNote} />));
  await flush();
  expect(container.querySelector('textarea')).toBeNull();
  expect(container.querySelector('[aria-label="Replacement code for M54.5"]')).toBeNull();
  expect(button('Apply code correction')).toBeUndefined();
  expect(button('Save note')).toBeUndefined();
  expect(container.textContent).toContain('Continuing');
});
