import React, { act, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ApplicationEntry } from './AppRoutes';
import { hasLoadedMetaPixel, updateMetaPixelConsent } from '../../utils/metaPixel';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/app', search: '?initialState=signUp', hash: '#start' }),
}), { virtual: true });
jest.mock('../../utils/metaPixel', () => ({
  hasLoadedMetaPixel: jest.fn(),
  updateMetaPixelConsent: jest.fn(),
}));
jest.mock('../AppShell/AuthWrapper', () => () => <div>Authentication</div>);

global.IS_REACT_ACT_ENVIRONMENT = true;

test.each([true, false])('isolates app entry when Meta was loaded: %s', async (loaded) => {
  const originalLocation = window.location;
  delete window.location;
  window.location = { replace: jest.fn() };
  hasLoadedMetaPixel.mockReturnValue(loaded);
  updateMetaPixelConsent.mockClear();
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Suspense fallback={null}><ApplicationEntry /></Suspense>));
    if (loaded) {
      expect(container.textContent).toBe('');
      expect(updateMetaPixelConsent).toHaveBeenCalledWith(false);
      expect(window.location.replace).toHaveBeenCalledWith('/app?initialState=signUp#start');
    } else {
      expect(container.textContent).toBe('Authentication');
      expect(window.location.replace).not.toHaveBeenCalled();
    }
  } finally {
    act(() => root.unmount());
    window.location = originalLocation;
  }
});
