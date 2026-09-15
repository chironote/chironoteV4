const loadMetaPixel = () => {
  jest.resetModules();
  return require('./metaPixel');
};

describe('Meta Pixel adapter', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.fbq;
    delete window._fbq;
    window.localStorage.clear();
    window.localStorage.setItem('cookieConsent', 'true');
    window.history.replaceState({}, '', '/demo');
  });

  test('does not load or send PageView before consent', () => {
    const metaPixel = loadMetaPixel();

    metaPixel.trackMetaPageView({ path: '/demo', hasConsent: false });

    expect(window.fbq).toBeUndefined();
    expect(document.getElementById('chironote-meta-pixel')).toBeNull();
  });

  test('loads the configured pixel and sends PageView only after consent', () => {
    const metaPixel = loadMetaPixel();

    metaPixel.updateMetaPixelConsent(true);
    metaPixel.trackMetaPageView({ path: '/demo', hasConsent: true });

    expect(document.getElementById('chironote-meta-pixel').src).toContain('connect.facebook.net');
    expect(window.fbq.queue.map((call) => Array.from(call))).toEqual(expect.arrayContaining([
      ['init', '3249774745170747'],
      ['consent', 'grant'],
      ['track', 'PageView'],
    ]));
  });

  test('uses a stable event ID for a confirmed Schedule event', () => {
    const metaPixel = loadMetaPixel();
    const eventId = metaPixel.createMetaBookingEventId('zoom-event-123');

    metaPixel.trackMetaScheduledDemo('zoom-event-123', true);
    metaPixel.trackMetaScheduledDemo('zoom-event-123', true);

    expect(eventId).toBe(metaPixel.createMetaBookingEventId('zoom-event-123'));
    const scheduleCalls = window.fbq.queue.filter((call) => call[0] === 'track' && call[1] === 'Schedule');
    expect(scheduleCalls).toHaveLength(2);
    expect(scheduleCalls.every((call) => call[3].eventID === eventId)).toBe(true);
  });

  test('revokes consent without sending a new event', () => {
    const metaPixel = loadMetaPixel();
    metaPixel.updateMetaPixelConsent(true);
    metaPixel.updateMetaPixelConsent(false);

    expect(window.fbq.queue.map((call) => Array.from(call))).toEqual(expect.arrayContaining([['consent', 'revoke']]));
  });

  test.each(['/app', '/app/billing', '/app?initialState=signUp', '/blog', '/unknown'])(
    'blocks all Meta entry points on %s even with consent', (path) => {
      window.history.replaceState({}, '', path);
      const metaPixel = loadMetaPixel();
      metaPixel.updateMetaPixelConsent(true);
      metaPixel.trackMetaPageView({ path: '/demo', hasConsent: true });
      metaPixel.trackMetaScheduledDemo('booking', true);
      expect(window.fbq).toBeUndefined();
      expect(document.getElementById('chironote-meta-pixel')).toBeNull();
    }
  );

  test.each([null, 'false'])('fails closed with stored consent %s', (consent) => {
    window.localStorage.removeItem('cookieConsent');
    if (consent) window.localStorage.setItem('cookieConsent', consent);
    const metaPixel = loadMetaPixel();
    metaPixel.updateMetaPixelConsent(true);
    metaPixel.trackMetaPageView({ path: '/demo', hasConsent: true });
    metaPixel.trackMetaScheduledDemo('booking', true);
    expect(window.fbq).toBeUndefined();
  });

  test('blocks stale callbacks after navigation into the app', () => {
    const metaPixel = loadMetaPixel();
    metaPixel.updateMetaPixelConsent(true);
    const previousCalls = window.fbq.queue.length;
    window.history.replaceState({}, '', '/app');
    metaPixel.trackMetaPageView({ path: '/demo', hasConsent: true });
    metaPixel.trackMetaScheduledDemo('booking', true);
    expect(window.fbq.queue).toHaveLength(previousCalls);
    expect(metaPixel.hasLoadedMetaPixel()).toBe(true);
  });
});
