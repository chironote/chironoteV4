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

// Initialize GA4 with cookies disabled
try {
  ReactGA.initialize("G-02117DNZDH", {
    client_storage: 'none', // Disable cookies
    anonymize_ip: true // Additional privacy measure
  });
  // Send initial pageview
  ReactGA.send({ hitType: "pageview", page: window.location.pathname });
} catch (error) {
  console.error("Error initializing Google Analytics:", error);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
