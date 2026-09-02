import ReactGA from 'react-ga4';

const DEFAULT_GA_MEASUREMENT_ID = 'G-02117DNZDH';
const DEFAULT_GOOGLE_ADS_ID = 'AW-16869907009';
const CONSENT_STORAGE_KEY = 'cookieConsent';
const GCLID_STORAGE_KEY = 'gclid';
const GCLID_EXPIRY_KEY = 'gclid_expiry';
const GOOGLE_ADS_CLICK_ID_STORAGE_KEY = 'google_ads_click_id';
const GOOGLE_ADS_CLICK_ID_TYPE_KEY = 'google_ads_click_id_type';
const GOOGLE_ADS_CLICK_ID_EXPIRY_KEY = 'google_ads_click_id_expiry';
const GOOGLE_ADS_CLICK_ID_TTL_DAYS = 90;
const GOOGLE_ADS_CLICK_ID_TYPES = ['gclid', 'gbraid', 'wbraid'];

export const GOOGLE_ADS_ATTRIBUTION_EVENT = 'chironote:google-ads-attribution-change';

const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID || DEFAULT_GA_MEASUREMENT_ID;
const googleAdsId = process.env.REACT_APP_GOOGLE_ADS_ID || DEFAULT_GOOGLE_ADS_ID;

let analyticsInitialized = false;
let queuedEvents = [];
let lastPageView = { path: '', timestamp: 0 };
let pendingGoogleAdsClickId = null;

const isBrowser = () => typeof window !== 'undefined';

const safeStorageGet = (storage, key) => {
  try {
    return storage?.getItem(key) || null;
  } catch (error) {
    return null;
  }
};

const safeStorageSet = (storage, key, value) => {
  try {
    storage?.setItem(key, value);
  } catch (error) {
    // Analytics storage should never interrupt the product experience.
  }
};

const safeStorageRemove = (storage, key) => {
  try {
    storage?.removeItem(key);
  } catch (error) {
    // Analytics storage should never interrupt the product experience.
  }
};

const readGoogleAdsClickIdFromUrl = () => {
  if (!isBrowser()) return null;

  const searchParams = new URLSearchParams(window.location.search);
  for (const type of GOOGLE_ADS_CLICK_ID_TYPES) {
    const value = searchParams.get(type)?.trim();
    if (value) return { type, value };
  }

  return null;
};

const createGoogleAdsClickId = ({ type, value }, expiry) => {
  let expiryDate = expiry ? new Date(expiry) : new Date();
  if (!expiry || Number.isNaN(expiryDate.getTime())) {
    expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + GOOGLE_ADS_CLICK_ID_TTL_DAYS);
  }

  return {
    type,
    value,
    expiry: expiryDate.toISOString(),
  };
};

const persistGoogleAdsClickId = (clickId) => {
  if (!isBrowser() || !clickId) return;

  safeStorageSet(window.localStorage, GOOGLE_ADS_CLICK_ID_STORAGE_KEY, clickId.value);
  safeStorageSet(window.localStorage, GOOGLE_ADS_CLICK_ID_TYPE_KEY, clickId.type);
  safeStorageSet(window.localStorage, GOOGLE_ADS_CLICK_ID_EXPIRY_KEY, clickId.expiry);
};

const clearStoredGoogleAdsClickIds = () => {
  if (!isBrowser()) return;

  [
    GOOGLE_ADS_CLICK_ID_STORAGE_KEY,
    GOOGLE_ADS_CLICK_ID_TYPE_KEY,
    GOOGLE_ADS_CLICK_ID_EXPIRY_KEY,
    GCLID_STORAGE_KEY,
    GCLID_EXPIRY_KEY,
  ].forEach((key) => {
    safeStorageRemove(window.localStorage, key);
    safeStorageRemove(window.sessionStorage, key);
  });
};

const notifyGoogleAdsAttributionChange = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(GOOGLE_ADS_ATTRIBUTION_EVENT));
};

const toEventToken = (value, fallback = 'unknown') => {
  const token = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);

  return token || fallback;
};

const compactParams = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

const consentState = (granted) => ({
  analytics_storage: granted ? 'granted' : 'denied',
  ad_storage: granted ? 'granted' : 'denied',
  ad_user_data: granted ? 'granted' : 'denied',
  ad_personalization: granted ? 'granted' : 'denied',
});

const consentedUserId = (userId) => (
  userId && getAnalyticsConsent() === true ? userId : undefined
);

const queueConsentCommand = (command, granted) => {
  if (!isBrowser()) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('consent', command, consentState(granted));
};

const flushQueuedEvents = () => {
  const pendingEvents = queuedEvents;
  queuedEvents = [];
  pendingEvents.forEach(({ eventName, params }) => ReactGA.event(eventName, params));
};

export const getAnalyticsConsent = () => {
  if (!isBrowser()) return null;

  const storedConsent = safeStorageGet(window.localStorage, CONSENT_STORAGE_KEY);
  if (storedConsent === 'true') return true;
  if (storedConsent === 'false') return false;
  return null;
};

export const initializeAnalytics = () => {
  if (!isBrowser() || analyticsInitialized) return;

  const hasConsent = getAnalyticsConsent() === true;
  queueConsentCommand('default', hasConsent);

  ReactGA.initialize([
    {
      trackingId: measurementId,
      gaOptions: {
        anonymizeIp: true,
        allowAdFeatures: hasConsent,
        allowAdPersonalizationSignals: hasConsent,
      },
      gtagOptions: { send_page_view: false },
    },
    {
      trackingId: googleAdsId,
      gaOptions: {
        anonymizeIp: true,
        allowAdFeatures: hasConsent,
        allowAdPersonalizationSignals: hasConsent,
      },
      gtagOptions: { send_page_view: false },
    },
  ]);

  analyticsInitialized = true;
  flushQueuedEvents();
};

export const updateAnalyticsConsent = (granted) => {
  if (!isBrowser()) return;

  safeStorageSet(window.localStorage, CONSENT_STORAGE_KEY, String(Boolean(granted)));
  initializeAnalytics();
  ReactGA.gtag('consent', 'update', consentState(Boolean(granted)));

  if (granted) {
    const currentClickId = pendingGoogleAdsClickId || readGoogleAdsClickIdFromUrl();
    const legacySessionGclid = safeStorageGet(window.sessionStorage, GCLID_STORAGE_KEY);
    const legacySessionExpiry = safeStorageGet(window.sessionStorage, GCLID_EXPIRY_KEY);

    if (currentClickId) {
      pendingGoogleAdsClickId = createGoogleAdsClickId(currentClickId);
      persistGoogleAdsClickId(pendingGoogleAdsClickId);
    } else if (legacySessionGclid && legacySessionExpiry) {
      pendingGoogleAdsClickId = createGoogleAdsClickId(
        { type: 'gclid', value: legacySessionGclid },
        legacySessionExpiry
      );
      persistGoogleAdsClickId(pendingGoogleAdsClickId);
    }
  } else {
    pendingGoogleAdsClickId = null;
    clearStoredGoogleAdsClickIds();
  }

  notifyGoogleAdsAttributionChange();
};

export const trackAnalyticsEvent = (eventName, params = {}) => {
  if (!isBrowser()) return;

  const normalizedEventName = toEventToken(eventName, 'feature_interaction').slice(0, 40);
  const compactedParams = compactParams(params);

  if (!analyticsInitialized) {
    queuedEvents.push({ eventName: normalizedEventName, params: compactedParams });
    return;
  }

  ReactGA.event(normalizedEventName, compactedParams);
};

export const trackRoutePageView = ({ path, title, pageType }) => {
  if (!isBrowser()) return;

  const now = Date.now();
  if (lastPageView.path === path && now - lastPageView.timestamp < 1000) return;
  lastPageView = { path, timestamp: now };

  trackAnalyticsEvent('page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: title || document.title,
    page_type: pageType,
  });
};

export const trackPageView = (pageName) => {
  trackAnalyticsEvent('page_view_detail', {
    page_name: toEventToken(pageName),
  });
};

export const trackLandingCta = ({ location, label, destination, plan }) => {
  trackAnalyticsEvent('landing_cta_click', {
    cta_location: toEventToken(location),
    cta_label: label,
    destination,
    plan: plan ? toEventToken(plan) : undefined,
  });
};

export const trackLandingNavigation = (section) => {
  trackAnalyticsEvent('landing_navigation', {
    destination_section: toEventToken(section),
  });
};

export const trackLandingSectionView = (section) => {
  trackAnalyticsEvent('landing_section_view', {
    section_name: toEventToken(section),
  });
};

export const trackLandingEngagement = ({ engagementSeconds, maxScrollDepth }) => {
  trackAnalyticsEvent('landing_engagement', {
    engagement_time_seconds: Math.max(0, Math.round(engagementSeconds || 0)),
    max_scroll_depth: Math.max(0, Math.min(100, Math.round(maxScrollDepth || 0))),
    transport_type: 'beacon',
  });
};

export const trackFaqOpen = (question, index) => {
  trackAnalyticsEvent('landing_faq_open', {
    faq_index: index + 1,
    faq_question: question,
  });
};

export const trackVideoProgress = (videoName, progressPercentage) => {
  trackAnalyticsEvent('video_progress', {
    video_title: videoName,
    video_percent: Math.round(progressPercentage),
  });
};

export const trackWebVital = ({ name, value, id, rating }) => {
  trackAnalyticsEvent('web_vital', {
    metric_name: name,
    metric_id: id,
    metric_value: name === 'CLS' ? Math.round(value * 1000) : Math.round(value),
    metric_rating: rating,
    non_interaction: true,
  });
};

export const trackRecordingStart = () => {
  trackAnalyticsEvent('recording_start', { feature_area: 'recording' });
};

export const trackApplyChanges = () => {
  trackAnalyticsEvent('note_edit_apply', { feature_area: 'smart_editor' });
};

export const trackDictationStart = () => {
  trackAnalyticsEvent('dictation_start', { feature_area: 'dictation' });
};

export const trackAccountPageButtonClick = (actionName) => {
  trackAnalyticsEvent('account_interaction', {
    interaction_name: toEventToken(actionName),
  });
};

export const trackRecordingCompleted = async (userId) => {
  const currentCount = Number.parseInt(safeStorageGet(window.localStorage, 'total_recordings') || '0', 10);
  const recordingCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;
  safeStorageSet(window.localStorage, 'total_recordings', String(recordingCount));

  trackAnalyticsEvent('recording_complete', {
    user_id: consentedUserId(userId),
    recording_count: recordingCount,
  });

  if (recordingCount === 5) {
    trackAnalyticsEvent('user_activated', {
      user_id: consentedUserId(userId),
      milestone: '5_recordings',
    });
  }
};

export const trackMilestone = async (eventName, userId, params = {}) => {
  trackAnalyticsEvent('user_milestone', {
    milestone_name: toEventToken(eventName),
    user_id: consentedUserId(userId),
    ...params,
  });
};

export const captureGoogleAdsClickId = () => {
  if (!isBrowser()) return;

  try {
    const clickId = readGoogleAdsClickIdFromUrl();
    if (!clickId) return;

    pendingGoogleAdsClickId = createGoogleAdsClickId(clickId);
    if (getAnalyticsConsent() === true) {
      persistGoogleAdsClickId(pendingGoogleAdsClickId);
    }
    notifyGoogleAdsAttributionChange();
  } catch (error) {
    // Ignore malformed URLs or unavailable storage.
  }
};

export const getGoogleAdsClickId = () => {
  if (!isBrowser()) return null;
  if (getAnalyticsConsent() !== true) return null;

  const currentClickId = readGoogleAdsClickIdFromUrl();
  if (currentClickId) return createGoogleAdsClickId(currentClickId);

  const value = safeStorageGet(window.localStorage, GOOGLE_ADS_CLICK_ID_STORAGE_KEY);
  const type = safeStorageGet(window.localStorage, GOOGLE_ADS_CLICK_ID_TYPE_KEY);
  const expiry = safeStorageGet(window.localStorage, GOOGLE_ADS_CLICK_ID_EXPIRY_KEY);
  if (value && GOOGLE_ADS_CLICK_ID_TYPES.includes(type) && expiry) {
    if (new Date() <= new Date(expiry)) return { type, value, expiry };
    clearStoredGoogleAdsClickIds();
    return null;
  }

  const legacyGclid = safeStorageGet(window.localStorage, GCLID_STORAGE_KEY);
  const legacyExpiry = safeStorageGet(window.localStorage, GCLID_EXPIRY_KEY);
  if (legacyGclid && legacyExpiry && new Date() <= new Date(legacyExpiry)) {
    return { type: 'gclid', value: legacyGclid, expiry: legacyExpiry };
  }

  if (legacyGclid || legacyExpiry) clearStoredGoogleAdsClickIds();
  return null;
};

export const captureGclid = captureGoogleAdsClickId;

export const getGclid = () => {
  const clickId = getGoogleAdsClickId();
  return clickId?.type === 'gclid' ? clickId.value : null;
};

export const setUserProperties = async (userId) => {
  if (!userId || getAnalyticsConsent() !== true) return;
  initializeAnalytics();
  ReactGA.set({ user_id: userId });
};

export const trackSignUp = async (email, userId) => {
  trackAnalyticsEvent('sign_up', {
    method: email ? 'email' : 'unknown',
    user_id: consentedUserId(userId),
  });
};

export const trackBeginCheckout = async (email, userId) => {
  trackAnalyticsEvent('begin_checkout', {
    user_id: consentedUserId(userId),
    user_state: email ? 'identified' : 'anonymous',
    currency: 'USD',
    items: [{
      item_id: 'chironote_subscription',
      item_name: 'ChiroNote Subscription',
      item_category: 'subscription',
    }],
  });
};

export const trackViewedCart = (email, userId) => {
  trackAnalyticsEvent('view_item_list', {
    user_id: consentedUserId(userId),
    user_state: email ? 'identified' : 'anonymous',
    item_list_id: 'subscription_pricing',
    item_list_name: 'Subscription pricing',
    items: [{
      item_id: 'chironote_subscription',
      item_name: 'ChiroNote Subscription',
      item_category: 'subscription',
    }],
  });
};
