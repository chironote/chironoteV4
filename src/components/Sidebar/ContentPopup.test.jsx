import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ContentPopup from './ContentPopup';
jest.mock('../Patients/PatientName', () => () => null);
jest.mock('../Patients/ReassignPatientDialog', () => () => null);
global.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
async function openEdit(onLabelUpdate) {
  await act(async () => root.render(<ContentPopup noteLabel="Initial visit" selectedContent="Synthetic body" showNotes onLabelUpdate={onLabelUpdate} />));
  expect(container.textContent).not.toContain('Rename');
  await act(async () => container.querySelector('[aria-label="Edit label"]').click());
  const input = container.querySelector('.label-edit-input');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Updated descriptor');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input;
}
test('clickable label edits and Enter saves once', async () => {
  const update = jest.fn(); const input = await openEdit(update);
  await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  expect(update).toHaveBeenCalledTimes(1); expect(update).toHaveBeenCalledWith('Updated descriptor');
});
test('Escape cancels label edits without closing the popup', async () => {
  const update = jest.fn(); const input = await openEdit(update);
  const escaped = jest.fn(); document.addEventListener('keydown', escaped);
  await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  document.removeEventListener('keydown', escaped);
  expect(update).not.toHaveBeenCalled(); expect(escaped).not.toHaveBeenCalled();
  expect(container.querySelector('[aria-label="Edit label"]')).not.toBeNull();
});
