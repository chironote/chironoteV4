import React from 'react';
import { createBrowserRouter, RouterProvider, Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import AuthContainer from './components/AuthUI/AuthContainer';
import AuthenticatedApp from './components/AppShell/AuthenticatedApp';
import DraftRouteGuard from './components/Patients/DraftRouteGuard';

function AppContent() {
  return <><DraftRouteGuard /><Routes>
    <Route path="/app/*" element={<AuthContainer><AuthenticatedApp /></AuthContainer>} />
    <Route path="*" element={<Navigate to="/app" replace />} />
  </Routes></>;
}

const router = createBrowserRouter([{ path: '*', element: <AppContent /> }]);
export default function App() { return <RouterProvider router={router} />; }
