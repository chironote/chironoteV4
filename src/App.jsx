import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import DraftRouteGuard from './components/Patients/DraftRouteGuard';
import CookieConsent from './components/CookieConsent/CookieConsent';
import GoogleAnalytics from './components/Analytics/GoogleAnalytics';
import PWARedirect from './components/AppRouting/PWARedirect';
import AppRoutes from './components/AppRouting/AppRoutes';

function AppContent() {
  return (
    <>
      <DraftRouteGuard />
      <GoogleAnalytics />
      <PWARedirect />
      <CookieConsent />
      <AppRoutes />
    </>
  );
}

const router = createBrowserRouter([{ path: '*', element: <AppContent /> }]);
export default function App() { return <RouterProvider router={router} />; }
