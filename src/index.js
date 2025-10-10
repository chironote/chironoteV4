import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import config from './amplifyconfiguration.json';

// Capacitor imports for mobile functionality
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

Amplify.configure(config);

const client = generateClient();

// Initialize Capacitor plugins when running on mobile
if (Capacitor.isNativePlatform()) {
  // Hide splash screen
  SplashScreen.hide();
  
  // Configure status bar
  StatusBar.setStyle({ style: Style.Light });
  StatusBar.setBackgroundColor({ color: '#ffffff' });
  
  // Add a class to the document body to enable native-only CSS overrides
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.add('native-mobile');
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
