import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import config from './amplifyconfiguration.json';
import ReactGA from "react-ga4";
import { HelmetProvider } from 'react-helmet-async';
import { isNativePlatform } from './services/nativePlatform';

Amplify.configure(config);

const client = generateClient();

if (!isNativePlatform()) {
  // Defer GA4 initialization until after page load for better performance.
  window.addEventListener('load', function() {
    setTimeout(function() {
      try {
        ReactGA.initialize([
          {
            trackingId: "G-02117DNZDH",
            gaOptions: {
              client_storage: 'none',
              anonymize_ip: true
            }
          },
          {
            trackingId: "AW-16869907009",
            gaOptions: {
              client_storage: 'localStorage',
              anonymize_ip: false
            }
          }
        ]);
      } catch (error) {
        console.error("Error initializing Google Analytics:", error);
      }
    }, 1500);
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
