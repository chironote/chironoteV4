import { Capacitor, registerPlugin } from '@capacitor/core';

const CredentialManager = registerPlugin('CredentialManager');

const isAndroid = () => Capacitor.getPlatform() === 'android';
const LEGACY_CREDENTIAL_KEYS = ['saved_email', 'saved_password'];

export const clearLegacyCredentials = (storage) => {
  try {
    const credentialStorage = storage ?? window.localStorage;
    LEGACY_CREDENTIAL_KEYS.forEach((key) => credentialStorage.removeItem(key));
  } catch {
    // Storage can be unavailable in restricted WebView contexts.
  }
};

export const getPasswordCredential = async () => {
  if (!isAndroid()) {
    return { available: false };
  }

  return CredentialManager.getPasswordCredential();
};

export const savePasswordCredential = async ({ username, password }) => {
  if (!isAndroid()) {
    return { saved: false };
  }

  return CredentialManager.savePasswordCredential({ username, password });
};

export const clearCredentialState = async () => {
  if (!isAndroid()) {
    return { cleared: false };
  }

  return CredentialManager.clearCredentialState();
};

export default CredentialManager;
