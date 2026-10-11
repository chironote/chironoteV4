import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ClipboardSaveReview from './ClipboardSaveReview';

global.IS_REACT_ACT_ENVIRONMENT = true;
test('resolved codes stay hidden while confirmation preserves their internal history', () => {
  const container = document.createElement('div'); const root = createRoot(container); const confirmed = jest.fn();
  const review = { kind: 'local', icdCodes: [
    { code: 'M54.2', description: 'Cervicalgia', status: 'resolved' },
    { code: 'M99.01', description: 'Cervical dysfunction', status: 'new' },
  ] };
  act(() => root.render(<ClipboardSaveReview review={review} onConfirm={confirmed} />));
  expect(container.textContent).toContain('M99.01'); expect(container.textContent).not.toMatch(/M54.2|Resolved|Continuing|Choose status/);
  expect(container.querySelector('select')).toBeNull();
  act(() => container.querySelector('button').click());
  expect(confirmed).toHaveBeenCalledWith(review);
  act(() => root.unmount());
});
