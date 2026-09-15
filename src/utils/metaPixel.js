// Keep the website destination alongside the existing GA4 and Google Ads defaults.
const DEFAULT_META_PIXEL_ID = '3249774745170747';

let initializedPixelId = null;
let lastPageView = { path: '', timestamp: 0 };

const isBrowser = () => typeof window !== 'undefined';

export const getMetaPixelId = () => DEFAULT_META_PIXEL_ID;

const getFbq = () => (isBrowser() && typeof window.fbq === 'function' ? window.fbq : null);

const loadPixel = () => {
  const pixelId = getMetaPixelId();
  if (!pixelId || !isBrowser()) return null;

  window.fbq = window.fbq || function fbq() {
    window.fbq.callMethod
      ? window.fbq.callMethod.apply(window.fbq, arguments)
      : window.fbq.queue.push(arguments);
  };
  window.fbq.push = window.fbq;
  window.fbq.loaded = true;
  window.fbq.version = '2.0';
  window.fbq.queue = window.fbq.queue || [];
  window._fbq = window._fbq || window.fbq;

  if (!document.getElementById('chironote-meta-pixel')) {
    const script = document.createElement('script');
    script.id = 'chironote-meta-pixel';
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }

  if (initializedPixelId !== pixelId) {
    window.fbq('init', pixelId);
    initializedPixelId = pixelId;
  }

  return window.fbq;
};

export const updateMetaPixelConsent = (granted) => {
  if (!isBrowser()) return;

  if (!granted) {
    getFbq()?.('consent', 'revoke');
    return;
  }

  const fbq = loadPixel();
  fbq?.('consent', 'grant');
};

export const trackMetaPageView = ({ path, hasConsent }) => {
  if (!hasConsent || !path) return;

  const now = Date.now();
  if (lastPageView.path === path && now - lastPageView.timestamp < 1000) return;

  const fbq = loadPixel();
  if (!fbq) return;

  lastPageView = { path, timestamp: now };
  fbq('track', 'PageView');
};

// Produces a non-PII, deterministic browser event ID without exposing Zoom's ID to Meta.
export const createMetaBookingEventId = (scheduledEventId) => {
  let hash = 2166136261;
  for (let index = 0; index < scheduledEventId.length; index += 1) {
    hash ^= scheduledEventId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `zoom_booking_${(hash >>> 0).toString(36)}`;
};

export const trackMetaScheduledDemo = (scheduledEventId, hasConsent) => {
  if (!hasConsent || typeof scheduledEventId !== 'string' || !scheduledEventId) return;

  const fbq = loadPixel();
  if (!fbq) return;

  fbq('track', 'Schedule', {}, {
    eventID: createMetaBookingEventId(scheduledEventId),
  });
};
