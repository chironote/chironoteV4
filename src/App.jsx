import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import CookieConsent from './components/CookieConsent/CookieConsent';
import RouteTracker from './components/AppRouting/RouteTracker';
import PWARedirect from './components/AppRouting/PWARedirect';
import AppRoutes from './components/AppRouting/AppRoutes';
import config from './amplifyconfiguration.json';
import { isNativePlatform } from './services/nativePlatform';

Amplify.configure(config);

function App() {
  const isNative = isNativePlatform();

  return (
    <Router>
      {!isNative && <RouteTracker />}
      {!isNative && <PWARedirect />}
      {!isNative && <CookieConsent />}
      <AppRoutes isNative={isNative} />
    </Router>
  );
}

export default App;
