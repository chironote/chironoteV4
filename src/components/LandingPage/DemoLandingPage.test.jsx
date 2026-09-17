import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import DemoLandingPage from './DemoLandingPage';

jest.mock('../../utils/analytics', () => ({
  getAnalyticsConsent: jest.fn(() => false),
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
    expect(signUpLink.textContent).toBe('Try It Now');

    require('../../utils/analytics').trackLandingCta.mockClear();
    act(() => signUpLink.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(require('../../utils/analytics').trackLandingCta).toHaveBeenCalledWith({
      location: 'hero',
      label: 'Try It Now',
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
    expect(document.body.textContent).toContain("LET'S CHAT");
    expect(document.body.textContent).toContain('Have a Human explain ChiroNote');
    expect(document.body.textContent).not.toContain('Join Nikita on Zoom.');
    expect(document.body.textContent).not.toContain('Get a quick introduction, then see the steps for yourself in a personal walkthrough.');
    expect(document.querySelector('.marketing-scheduler__details')).toBeNull();
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
