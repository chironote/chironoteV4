import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import VisitDetailsDialog from './VisitDetailsDialog';
import { patientRequest } from '../../services/patientNotes';
jest.mock('../../services/patientNotes', () => ({ patientRequest: jest.fn(), localDate: () => '2026-10-11' }));
global.IS_REACT_ACT_ENVIRONMENT = true;
test('visit details retain conditional metadata updates without a second clinical editor', async () => {
  const note = { timestamp: '123', version: 'v1', note: 'Synthetic note', patientId: 'p', visitLabel: 'Initial visit', visitType: 'initialExam', dateOfService: '2026-10-01', ready: true };
  patientRequest.mockImplementation(async operation => {
    if (operation === 'getSavedNote') return { note };
    if (operation === 'getPatient') return { patient: { patientId: 'p', name: 'Jordan Example' } };
    if (operation === 'updateVisitMetadata') return { status: 'UPDATED', note: { ...note, version: 'v2' } };
    return { items: [] };
  });
  const onSaved = jest.fn(); const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  await act(async () => root.render(<VisitDetailsDialog timestamp="123" onClose={() => {}} onSaved={onSaved} />));
  expect(container.querySelector('textarea')).toBeNull();
  await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Save visit details').click());
  expect(patientRequest).toHaveBeenCalledWith('updateVisitMetadata', expect.objectContaining({ timestamp: '123', expectedVersion: 'v1', patientId: 'p', dateOfService: '2026-10-01' }));
  expect(patientRequest.mock.calls.some(([op]) => op === 'saveNote')).toBe(false);
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ version: 'v2' }));
  act(() => root.unmount()); container.remove();
});
