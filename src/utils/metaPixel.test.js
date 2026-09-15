const loadMetaPixel = () => {
  jest.resetModules();
  return require('./metaPixel');
};

describe('Meta Pixel adapter', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.fbq;
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
    expect(window.fbq.queue).toEqual(expect.arrayContaining([
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

    expect(window.fbq.queue).toEqual(expect.arrayContaining([['consent', 'revoke']]));
  });
});
