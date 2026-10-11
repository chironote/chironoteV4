// Remove obsolete plaintext credentials without reading or logging their values.
// Keep Cognito session storage and unrelated application preferences intact.
export function clearLegacyCredentials() {
  for (const key of ['saved_email', 'saved_password']) {
    try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
  }
}
