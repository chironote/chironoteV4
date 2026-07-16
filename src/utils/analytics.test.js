jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
    event: jest.fn(),
    gtag: jest.fn(),
    set: jest.fn(),
  },
}));

const loadAnalytics = () => {
  jest.resetModules();
  const ReactGA = require('react-ga4').default;
  const analytics = require('./analytics');
  return { ReactGA, analytics };
};

describe('analytics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.dataLayer = [];
    delete window.gtag;
    jest.clearAllMocks();
  });

  test('starts Consent Mode denied and disables automatic page views', () => {
    const { ReactGA, analytics } = loadAnalytics();

    analytics.initializeAnalytics();

    const consentCommand = Array.from(window.dataLayer[0]);
    expect(consentCommand).toEqual([
      'consent',
      'default',
      expect.objectContaining({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      }),
    ]);
    expect(ReactGA.initialize).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          trackingId: 'G-02117DNZDH',
          gtagOptions: { send_page_view: false },
        }),
      ])
    );
  });

  test('queues feature events without identifiers until analytics initialization', async () => {
    const { ReactGA, analytics } = loadAnalytics();

    await analytics.trackSignUp('doctor@example.com', 'user-123');
    expect(ReactGA.event).not.toHaveBeenCalled();

    analytics.initializeAnalytics();
    expect(ReactGA.event).toHaveBeenCalledWith('sign_up', {
      method: 'email',
    });
    expect(JSON.stringify(ReactGA.event.mock.calls)).not.toContain('doctor@example.com');
    expect(JSON.stringify(ReactGA.event.mock.calls)).not.toContain('user-123');
  });

  test('attaches an opaque user ID only after consent', async () => {
    const { ReactGA, analytics } = loadAnalytics();

    analytics.updateAnalyticsConsent(true);
    await analytics.trackSignUp('doctor@example.com', 'user-123');

    expect(ReactGA.event).toHaveBeenCalledWith('sign_up', {
      method: 'email',
      user_id: 'user-123',
    });
  });

  test('updates all consent categories and persists the choice', () => {
    const { ReactGA, analytics } = loadAnalytics();

    analytics.updateAnalyticsConsent(true);

    expect(window.localStorage.getItem('cookieConsent')).toBe('true');
    expect(ReactGA.gtag).toHaveBeenCalledWith(
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      })
    );
  });

  test('deduplicates the Strict Mode page view while preserving route context', () => {
    const { ReactGA, analytics } = loadAnalytics();
    analytics.initializeAnalytics();

    analytics.trackRoutePageView({ path: '/', title: 'ChiroNote', pageType: 'landing' });
    analytics.trackRoutePageView({ path: '/', title: 'ChiroNote', pageType: 'landing' });

    expect(ReactGA.event).toHaveBeenCalledTimes(1);
    expect(ReactGA.event).toHaveBeenCalledWith('page_view', expect.objectContaining({
      page_path: '/',
      page_type: 'landing',
    }));
  });

  test('stores ad click IDs in the session until consent is granted', () => {
    window.history.replaceState({}, '', '/?gclid=test-click-id');
    const { analytics } = loadAnalytics();

    analytics.captureGclid();
    expect(window.sessionStorage.getItem('gclid')).toBe('test-click-id');
    expect(window.localStorage.getItem('gclid')).toBeNull();

    analytics.updateAnalyticsConsent(true);
    expect(window.localStorage.getItem('gclid')).toBe('test-click-id');
    window.history.replaceState({}, '', '/');
  });
});
