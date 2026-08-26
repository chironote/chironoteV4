import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import DemoLandingPage from './DemoLandingPage';

jest.mock('../../utils/analytics', () => ({
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
    expect(scheduler.getAttribute('src')).toBe('https://scheduler.zoom.us/nikita-predtechensky/chironote-demo?embed=true');
    expect(scheduler.getAttribute('loading')).toBe('lazy');
    expect(document.querySelector('.marketing-hero__summary').textContent).toContain('shockwave visits');
    expect(document.body.textContent).toContain('Learn the workflow with us');
  });
});
