import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createMemoryRouter, Link } from 'react-router-dom';
import { RouterProvider } from 'react-router';
import DraftRouteGuard from './DraftRouteGuard';
import useDraftGuard from './useDraftGuard';
global.IS_REACT_ACT_ENVIRONMENT = true;
// Router 7.2's CommonJS DOM bundle duplicates router contexts. Use the real core
// provider with the DOM wrapper's flushSync option; production ESM shares contexts.
test('router navigation remains blocked after a failed save and proceeds only after explicit discard', async () => {
  const save = jest.fn().mockResolvedValue(false);
  function Editor() {
    const [dirty, setDirty] = useState(true);
    const guard = useDraftGuard({ dirty, save, discard: () => setDirty(false) });
    return <><DraftRouteGuard />{guard.dialog}<p>Draft remains here</p><Link to="/next">Next</Link></>;
  }
  const router = createMemoryRouter([{ path: '/', element: <Editor /> }, { path: '/next', element: <p>Next page</p> }]);
  const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
  const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);
  await act(async () => root.render(<RouterProvider router={router} flushSync={flushSync} />));
  await act(async () => container.querySelector('a').click());
  expect(router.state.location.pathname).toBe('/');
  await act(async () => button('Save and continue').click());
  expect(save).toHaveBeenCalledTimes(1); expect(router.state.location.pathname).toBe('/');
  await act(async () => container.querySelector('a').click());
  await act(async () => button('Discard changes').click());
  expect(router.state.location.pathname).toBe('/next');
  act(() => root.unmount()); container.remove(); router.dispose();
});
