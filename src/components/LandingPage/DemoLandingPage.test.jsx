import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import DemoLandingPage from './DemoLandingPage';
import { getGoogleAdsClickId } from '../../utils/analytics';

jest.mock('../../utils/analytics', () => ({
  GOOGLE_ADS_ATTRIBUTION_EVENT: 'chironote:google-ads-attribution-change',
  getGoogleAdsClickId: jest.fn(() => null),
  trackAnalyticsEvent: jest.fn(),
  trackFaqOpen: jest.fn(),
  trackLandingCta: jest.fn(),
  trackLandingEngagement: jest.fn(),
  trackLandingNavigation: jest.fn(),
  trackLandingSectionView: jest.fn(),
  trackVideoProgress: jest.fn(),
}));

const renderDemoLandingPage = () => {
  const markup = renderToStaticMarkup(
    <HelmetProvider>
      <DemoLandingPage />
    </HelmetProvider>
  );
  document.body.innerHTML = markup;
};

global.IS_REACT_ACT_ENVIRONMENT = true;

const renderClientDemoLandingPage = (root) => {
  act(() => root.render(
    <HelmetProvider>
      <DemoLandingPage />
    </HelmetProvider>
  ));
};

describe('DemoLandingPage', () => {
  beforeEach(() => {
    getGoogleAdsClickId.mockReturnValue(null);
  });

  test('uses the scheduler as its main conversion path and omits pricing', () => {
    renderDemoLandingPage();

    expect(document.querySelector('.marketing-pricing')).toBeNull();
    expect(document.querySelector('a[href="#prices"]')).toBeNull();
    expect(document.querySelectorAll('a[href="#scheduler"]').length).toBeGreaterThanOrEqual(4);
    expect(Array.from(document.querySelectorAll('a[href="#scheduler"]')).every((link) => link.textContent.includes('Schedule a walkthrough') || link.textContent.includes('Walkthrough'))).toBe(true);
  });

  test('offers a tracked sign-up path beside the streamlined hero walkthrough CTA', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    renderClientDemoLandingPage(root);
    const heroActions = container.querySelector('.marketing-hero__actions');
    const walkthroughLink = heroActions.querySelector('a[href="#scheduler"]');
    const signUpLink = heroActions.querySelector('a[href="/app?initialState=signUp"]');

    expect(walkthroughLink.textContent).toBe('Schedule a walkthrough');
    expect(signUpLink.textContent).toBe('Sign up');

    require('../../utils/analytics').trackLandingCta.mockClear();
    act(() => signUpLink.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(require('../../utils/analytics').trackLandingCta).toHaveBeenCalledWith({
      location: 'hero',
      label: 'Sign up',
      destination: '/app?initialState=signUp',
      plan: undefined,
    });

    act(() => root.unmount());
    container.remove();
  });

  test('embeds the Zoom scheduler with practical walkthrough context', () => {
    renderDemoLandingPage();

    const scheduler = document.querySelector('#scheduler iframe');
    expect(scheduler).not.toBeNull();
    const schedulerUrl = new URL(scheduler.getAttribute('src'));
    expect(schedulerUrl.origin).toBe('https://scheduler.zoom.us');
    expect(schedulerUrl.searchParams.get('embed')).toBe('true');
    expect(schedulerUrl.searchParams.get('origin')).toBe('https://chironote.ai');
    expect(schedulerUrl.searchParams.has('utm_content')).toBe(false);
    expect(scheduler.getAttribute('loading')).toBe('lazy');
    expect(document.querySelector('h1').textContent).toContain('SOAP notes, written while you treat.');
    expect(document.querySelector('.marketing-hero__summary').textContent).toContain('structured chiropractic SOAP note');
    expect(document.body.textContent).toContain('Pick a timeslot below');
  });

  test.each([
    ['gclid', 'g:'],
    ['gbraid', 'b:'],
    ['wbraid', 'w:'],
  ])('passes a consented %s through Zoom tracking', (type, prefix) => {
    getGoogleAdsClickId.mockReturnValue({ type, value: 'test-click-id' });
    renderDemoLandingPage();

    const schedulerUrl = new URL(document.querySelector('#scheduler iframe').getAttribute('src'));
    expect(schedulerUrl.searchParams.get('utm_source')).toBe('google_ads');
    expect(schedulerUrl.searchParams.get('utm_medium')).toBe('cpc');
    expect(schedulerUrl.searchParams.get('utm_campaign')).toBe('demo_landing_page');
    expect(schedulerUrl.searchParams.get('utm_content')).toBe(`${prefix}test-click-id`);
  });

  test('tracks a confirmed Zoom Scheduler booking once', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    renderClientDemoLandingPage(root);
    const scheduler = container.querySelector('#scheduler iframe');
    const bookingMessage = {
      type: 'bookingForm',
      payload: { scheduledEventId: 'scheduler-event-123' },
    };

    require('../../utils/analytics').trackAnalyticsEvent.mockClear();

    act(() => window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://scheduler.zoom.us',
      source: scheduler.contentWindow,
      data: bookingMessage,
    })));
    act(() => window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://scheduler.zoom.us',
      source: scheduler.contentWindow,
      data: bookingMessage,
    })));

    expect(require('../../utils/analytics').trackAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(require('../../utils/analytics').trackAnalyticsEvent).toHaveBeenCalledWith('booked_demo', {
      booking_channel: 'zoom_scheduler',
      zoom_scheduled_event_id: 'scheduler-event-123',
    });

    act(() => root.unmount());
    container.remove();
  });

  test('ignores non-Zoom and malformed booking messages', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    renderClientDemoLandingPage(root);
    const scheduler = container.querySelector('#scheduler iframe');
    const sendMessage = (origin, data) => act(() => window.dispatchEvent(new MessageEvent('message', {
      origin,
      source: scheduler.contentWindow,
      data,
    })));

    require('../../utils/analytics').trackAnalyticsEvent.mockClear();

    sendMessage('https://example.com', { type: 'bookingForm', payload: { scheduledEventId: 'wrong-origin' } });
    sendMessage('https://scheduler.zoom.us', { type: 'bookingForm', payload: {} });

    expect(require('../../utils/analytics').trackAnalyticsEvent).not.toHaveBeenCalled();

    act(() => root.unmount());
    container.remove();
  });
});
