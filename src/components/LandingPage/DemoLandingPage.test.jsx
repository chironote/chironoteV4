import React from 'react';
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
    expect(document.querySelector('.marketing-hero__summary').textContent).toContain('shockwave visits');
    expect(document.body.textContent).toContain('Learn the workflow with us');
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
});
