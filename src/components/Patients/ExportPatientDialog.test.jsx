import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ExportPatientDialog from './ExportPatientDialog';
import { patientRequest, exportPatientNotes } from '../../services/patientNotes';
jest.mock('../../services/patientNotes', () => ({ patientRequest: jest.fn(), exportPatientNotes: jest.fn(), localDate: () => '2026-10-10' }));
global.IS_REACT_ACT_ENVIRONMENT = true;
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
  await act(async () => container.querySelector('input[type="checkbox"]').click());
  expect(create.disabled).toBe(false);
  await act(async () => create.click());
  expect(exportPatientNotes).toHaveBeenCalledWith(expect.objectContaining({ noteTimestamps: notes.map(note => note.timestamp), exportDetails: { dateOfBirth: null, dateOfInjury: null } }));
  act(() => root.unmount()); container.remove();
});
