import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import config from './amplifyconfiguration.json';
import ReactGA from "react-ga4";

Amplify.configure(config);

const client = generateClient();

// Initialize GA4 with default privacy settings
// Full configuration with user consent will be handled in CookieConsent component
try {
  ReactGA.initialize("G-02117DNZDH", {
    client_storage: 'none', // Default to cookies disabled
    anonymize_ip: true // Default to anonymize IP
  });
  // Initial pageview will be sent after consent check
} catch (error) {
  console.error("Error initializing Google Analytics:", error);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
