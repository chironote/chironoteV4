import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import DraftRouteGuard from './components/Patients/DraftRouteGuard';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import CookieConsent from './components/CookieConsent/CookieConsent';
import RouteTracker from './components/AppRouting/RouteTracker';
import PWARedirect from './components/AppRouting/PWARedirect';
import AppRoutes from './components/AppRouting/AppRoutes';
import config from './amplifyconfiguration.json';
import { isNativePlatform, addNativeAppStateListener } from './services/nativePlatform';
import { cleanupPatientPdfCache } from './services/patientPdfDelivery';

Amplify.configure(config);

function AppContent() {
  const isNative = isNativePlatform();
  useEffect(() => {
    cleanupPatientPdfCache();
    let disposed = false;
    let handle;
    addNativeAppStateListener(({ isActive }) => { if (isActive) cleanupPatientPdfCache(); })
      .then(listener => { if (disposed) listener?.remove(); else handle = listener; }).catch(() => {});
    return () => { disposed = true; handle?.remove(); };
  }, []);

  return (
    <>
      <DraftRouteGuard />
      {!isNative && <RouteTracker />}
      {!isNative && <PWARedirect />}
      {!isNative && <CookieConsent />}
      <AppRoutes isNative={isNative} />
    </>
  );
}

const router = createBrowserRouter([{ path: '*', element: <AppContent /> }]);
export default function App() { return <RouterProvider router={router} />; }
