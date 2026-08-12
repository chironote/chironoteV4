import { sanitizeTrackSettings } from './recordingTelemetrySchema';

const FALLBACK_APP_BUILD = '1.3.0';

const detectPlatform = (userAgent) => {
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'ios';
  }
  return 'web';
};

const detectBrowser = (userAgent) => {
  if (/; wv\)|\bwv\b|capacitor/i.test(userAgent)) {
    return 'webview';
  }
  if (/edg(?:a|ios)?\//i.test(userAgent)) {
    return 'edge';
  }
  if (/firefox\/|fxios\//i.test(userAgent)) {
    return 'firefox';
  }
  if (/chrome\/|crios\//i.test(userAgent) && !/chromium/i.test(userAgent)) {
    return 'chrome';
  }
  if (
    /safari\//i.test(userAgent) &&
    !/chrome|chromium|crios|fxios|edgios|android/i.test(userAgent)
  ) {
    return 'safari';
  }
  return 'unknown';
};

export const getRecordingClientContext = (
  navigatorObject = typeof navigator !== 'undefined' ? navigator : null
) => {
  const userAgent = navigatorObject?.userAgent || '';
  const platform = detectPlatform(userAgent);

  return {
    appBuild: process.env.REACT_APP_BUILD_VERSION ||
      process.env.REACT_APP_SOURCE_VERSION ||
      process.env.REACT_APP_VERSION ||
      FALLBACK_APP_BUILD,
    browser: detectBrowser(userAgent),
    platform,
    source: `client.${platform}`
  };
};

const encodeText = (value) => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value);
  }
  return Uint8Array.from(value, character => character.charCodeAt(0) & 0xff);
};

export const createPrivacySafeDeviceHash = async (
  track,
  recordingJobId,
  cryptoObject = typeof window !== 'undefined' ? window.crypto : null
) => {
  const settings = track?.getSettings?.() || {};
  const deviceMaterial = [
    track?.kind || '',
    track?.label || '',
    settings.deviceId || '',
    settings.groupId || ''
  ].join('|');

  if (!deviceMaterial.replace(/\|/g, '') || !cryptoObject?.subtle?.digest) {
    return null;
  }

  const saltedMaterial = `${recordingJobId}|${deviceMaterial}`;
  const digest = await cryptoObject.subtle.digest('SHA-256', encodeText(saltedMaterial));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
};

export const getAppliedTrackSettings = (track) => (
  sanitizeTrackSettings(track?.getSettings?.() || {})
);
