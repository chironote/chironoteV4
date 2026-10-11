import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ExportPatientDialog from './ExportPatientDialog';
import { patientRequest, exportPatientNotes } from '../../services/patientNotes';
jest.mock('../../services/patientNotes', () => ({ patientRequest: jest.fn(), exportPatientNotes: jest.fn(), localDate: () => '2026-10-10' }));
jest.mock('./SignatureSettings', () => ({ SignatureDialog: ({ onSaved }) => <button onClick={() => onSaved({ name: 'Updated Synthetic', npi: '1234567890' })}>Save test signature</button> }));
jest.mock('./VisitDetailsDialog', () => ({ __esModule: true, default: ({ onClose }) => <button onClick={onClose}>Close test visit details</button> }));

global.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => { patientRequest.mockReset(); exportPatientNotes.mockReset(); });
test('exports the complete paginated inventory beyond 100 saved visits with confirmed missing dates', async () => {
  const notes = Array.from({ length: 151 }, (_, index) => ({ timestamp: String(index + 1), note: 'Assessment: synthetic', dateOfService: '2026-09-01', ready: true }));
  patientRequest.mockImplementation(async (operation, input) => {
    if (operation === 'getSignature') return { name: 'Synthetic Clinician', npi: '1234567890' };
    const start = Number(input.cursor || 0);
    return { notes: notes.slice(start, start + 50), nextCursor: start + 50 < notes.length ? String(start + 50) : null };
  });
  exportPatientNotes.mockResolvedValue(undefined);
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  await act(async () => root.render(<ExportPatientDialog patient={{ patientId: 'p', name: 'Synthetic' }} onClose={() => {}} />));
  const calls = patientRequest.mock.calls.filter(([operation]) => operation === 'getPatientVisits');
  expect(calls).toHaveLength(4); expect(calls.every(([, input]) => input.completeInventory === true)).toBe(true);
  const create = [...container.querySelectorAll('button')].find(node => node.textContent === 'Create PDF');
  expect(create.disabled).toBe(true);
  expect(container.querySelector('[aria-label="Confirm clinical information"]').parentElement.textContent.trim()).toBe('I acknowledge that the clinical information herein is accurate.');
  await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
  expect(create.disabled).toBe(false);
  await act(async () => create.click());
  expect(exportPatientNotes).toHaveBeenCalledWith(expect.objectContaining({ noteTimestamps: notes.map(note => note.timestamp), exportDetails: { dateOfBirth: null, dateOfInjury: null } }));
  act(() => root.unmount()); container.remove();
});

test('PDF blockers and failed downloads explain the next step beside Create PDF', async () => {
  patientRequest.mockImplementation(async operation => operation === 'getSignature' ? { name: 'Synthetic', npi: '1234567890' } : { notes: [{ timestamp: '1', ready: true, dateOfService: '2026-09-01', needsContextReview: true }], nextCursor: null });
  exportPatientNotes.mockRejectedValueOnce(new Error('PDF export is not enabled for this release.'));
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  await act(async () => root.render(<ExportPatientDialog patient={{ patientId: 'p', name: 'Synthetic' }} onClose={() => {}} />));
  expect(container.querySelector('#pdf-requirements').textContent).toContain('Confirm the clinical information');
  expect(container.querySelector('#pdf-requirements').textContent).toContain('Acknowledge clinical review');
  await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
  await act(async () => container.querySelector('.patient-export-list .patient-check:last-child input').click());
  const create = [...container.querySelectorAll('button')].find(item => item.textContent === 'Create PDF');
  expect(create.disabled).toBe(false);
  await act(async () => create.click());
  expect(container.querySelector('.patient-export-result').textContent).toContain('not enabled');
  act(() => root.unmount()); container.remove();
});

describe('note ranges and recovery', () => {
  let container, root;
  const notes = [
    { timestamp: '1', ready: true, dateOfService: '2026-09-01', visitLabel: 'Early visit' },
    { timestamp: '2', ready: true, dateOfService: '2026-09-10', visitLabel: 'Start boundary' },
    { timestamp: '3', ready: true, dateOfService: '2026-09-15', visitLabel: 'Middle visit' },
    { timestamp: '4', ready: true, dateOfService: '2026-09-20', visitLabel: 'End boundary' },
    { timestamp: '5', ready: false, dateOfService: '2026-09-15', visitLabel: 'Processing visit' },
  ];
  const respond = async operation => operation === 'getSignature' ? { name: 'Synthetic Clinician', npi: '1234567890' } : { notes, nextCursor: null };
  const button = name => [...container.querySelectorAll('button')].find(node => node.textContent === name);
  const click = async name => act(async () => button(name).click());
  const setDate = async (label, value) => act(async () => {
    const input = container.querySelector(`[aria-label="${label}"]`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const mount = async () => act(async () => root.render(<ExportPatientDialog patient={{ patientId: 'p', name: 'Synthetic' }} onClose={() => {}} />));
  beforeEach(() => {
    patientRequest.mockImplementation(respond); exportPatientNotes.mockResolvedValue(undefined);
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  test('selects an inclusive range, allows individual exclusions and restores all notes', async () => {
    await mount();
    expect(button('All notes').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[aria-label="From date"]')).toBeNull();
    expect(container.querySelector('.patient-calendar')).toBeNull();
    expect(container.textContent).not.toMatch(/inventory/i);
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await click('Custom range');
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false);
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await setDate('From date', '2026-09-10');
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false); await setDate('To date', '2026-09-20');
    expect(container.querySelector('.patient-export-list').textContent).not.toContain('Early visit');
    const middle = [...container.querySelectorAll('.patient-export-note')].find(node => node.textContent.includes('Middle visit'));
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await act(async () => middle.querySelector('input').click());
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false);
    expect(button('Create PDF').disabled).toBe(true);
    expect(container.querySelector('.patient-export-list-heading input').indeterminate).toBe(true);
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await click('Create PDF');
    expect(exportPatientNotes).toHaveBeenLastCalledWith(expect.objectContaining({ noteTimestamps: ['2', '4'] }));
    await click('All notes');
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false);
    expect(button('Create PDF').disabled).toBe(true);
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await click('Create PDF');
    expect(exportPatientNotes).toHaveBeenLastCalledWith(expect.objectContaining({ noteTimestamps: ['1', '2', '3', '4'] }));
  });

  test('select all changes require a new clinical acknowledgment', async () => {
    await mount();
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await act(async () => container.querySelector('.patient-export-list-heading input').click());
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false);
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await act(async () => container.querySelector('.patient-export-list-heading input').click());
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false);
    expect(button('Create PDF').disabled).toBe(true);
  });

  test('saving a signature requires a new clinical acknowledgment', async () => {
    await mount();
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await click('Edit signature'); await click('Save test signature');
    expect(container.textContent).toContain('Updated Synthetic');
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false);
    expect(button('Create PDF').disabled).toBe(true);
  });

  test('refreshing visit details clears the clinical acknowledgment', async () => {
    patientRequest.mockImplementation(async operation => operation === 'getSignature' ? respond(operation) : { notes: [...notes, { timestamp: '6', ready: true, visitLabel: 'Undated visit' }], nextCursor: null });
    await mount();
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await click('Add visit date'); await click('Close test visit details');
    expect(patientRequest.mock.calls.filter(([operation]) => operation === 'getPatientVisits')).toHaveLength(2);
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false);
  });

  test('invalid, missing and empty date ranges cannot export hidden selections', async () => {
    await mount(); await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await click('Custom range');
    await setDate('From date', '2026-09-21');
    expect(container.querySelector('#export-range-error').textContent).toContain('End date');
    expect(button('Create PDF').disabled).toBe(true);
    await setDate('To date', '');
    expect(container.querySelector('#export-range-error').textContent).toContain('start and end');
    await setDate('To date', '2026-09-30');
    expect(container.textContent).toContain('No notes in this date range.');
    expect(button('Create PDF').disabled).toBe(true);
    expect(exportPatientNotes).not.toHaveBeenCalled();
  });

  test('undated notes require correction for All notes and are explicitly excluded from ranges', async () => {
    patientRequest.mockImplementation(async operation => operation === 'getSignature' ? respond(operation) : { notes: [...notes, { timestamp: '6', ready: true, visitLabel: 'Undated visit' }], nextCursor: null });
    await mount(); await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    expect(button('Create PDF').disabled).toBe(true);
    expect(container.querySelector('#pdf-requirements').textContent).toContain('missing visit dates');
    await click('Custom range');
    expect(container.querySelector('.patient-export-undated').textContent).toContain('1 note needs a visit date');
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false);
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await click('Create PDF');
    expect(exportPatientNotes).toHaveBeenCalledWith(expect.objectContaining({ noteTimestamps: ['1', '2', '3', '4'] }));
  });

  test('a failed load offers Try again and never enables export with partial inventory', async () => {
    patientRequest.mockRejectedValueOnce(new Error('Could not load notes.'));
    await mount();
    expect(container.textContent).toContain('Could not load notes.');
    expect(button('Create PDF').disabled).toBe(true);
    await click('Try again');
    expect(container.querySelector('.patient-export-list-heading').textContent).toContain('4 of 4 selected');
    expect(button('Try again')).toBeUndefined();
  });

  test('changing patient dates requires clinical confirmation again and preserves injury-date checks', async () => {
    patientRequest.mockImplementation(async operation => operation === 'getSignature' ? respond(operation) : { notes: [{ ...notes[0], dateOfInjury: '2026-08-01' }], nextCursor: null });
    await mount();
    expect(container.querySelector('#pdf-requirements').textContent).toContain('injury dates');
    await act(async () => container.querySelector('[aria-label="Confirm clinical information"]').click());
    await click('Edit dates');
    const injury = [...container.querySelectorAll('#export-patient-dates label')].find(node => node.textContent === 'Date of injury').querySelector('input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(injury, '2026-08-01');
      injury.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelector('[aria-label="Confirm clinical information"]').checked).toBe(false);
    expect(container.querySelector('#pdf-requirements').textContent).not.toContain('injury dates');
    expect(button('Create PDF').disabled).toBe(true);
  });
});
