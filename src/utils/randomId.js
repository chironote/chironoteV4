// Older supported WebViews have secure random bytes but not crypto.randomUUID.
export function randomId() {
  const source = typeof window !== 'undefined' ? window.crypto : undefined;
  if (source?.randomUUID) return source.randomUUID();
  if (!source?.getRandomValues) throw new Error('Secure identifiers are unavailable. Please update your browser.');
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
