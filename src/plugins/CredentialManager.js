import { registerPlugin } from '@capacitor/core';

const CredentialManager = registerPlugin('CredentialManager', {
  web: () => import('./CredentialManagerWeb.js').then(m => new m.CredentialManagerWeb()),
});

export default CredentialManager;
