import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import config from './amplifyconfiguration.json';
import ReactGA from "react-ga4";
import { HelmetProvider } from 'react-helmet-async';

Amplify.configure(config);

const client = generateClient();

// Defer GA4 initialization until after page load for better performance
window.addEventListener('load', function() {
  setTimeout(function() {
    try {
      ReactGA.initialize([
        {
          trackingId: "G-02117DNZDH",
          gaOptions: {
            client_storage: 'none', // Default to cookies disabled
            anonymize_ip: true // Default to anonymize IP
          }
        },
        {
          trackingId: "AW-16869907009",
          gaOptions: {
            client_storage: 'localStorage', // Always enable storage for Ads
            anonymize_ip: false
          }
        }
      ]);
      // Initial pageview will be sent after consent check
    } catch (error) {
      console.error("Error initializing Google Analytics:", error);
    }
  }, 1500); // Load 1.5 seconds after page load
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
