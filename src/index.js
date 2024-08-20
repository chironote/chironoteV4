import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import config from './amplifyconfiguration.json';
Amplify.configure(config);

const client = generateClient();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);