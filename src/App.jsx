import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import CookieConsent from './components/CookieConsent/CookieConsent';
import GoogleAnalytics from './components/Analytics/GoogleAnalytics';
import PWARedirect from './components/AppRouting/PWARedirect';
import AppRoutes from './components/AppRouting/AppRoutes';

function App() {
  return (
    <Router>
      <GoogleAnalytics />
      <PWARedirect />
      <CookieConsent />
      <AppRoutes />
    </Router>
  );
}

export default App;
