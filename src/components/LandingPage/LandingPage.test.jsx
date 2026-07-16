import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import LandingPage from './LandingPage';

jest.mock('../../utils/analytics', () => ({
  trackAnalyticsEvent: jest.fn(),
  trackFaqOpen: jest.fn(),
  trackLandingCta: jest.fn(),
  trackLandingEngagement: jest.fn(),
  trackLandingNavigation: jest.fn(),
  trackLandingSectionView: jest.fn(),
  trackVideoProgress: jest.fn(),
}));

const renderLandingPage = () => {
  const markup = renderToStaticMarkup(
    <HelmetProvider>
      <LandingPage />
    </HelmetProvider>
  );
  document.body.innerHTML = markup;
};

describe('LandingPage', () => {
  test('uses working destinations instead of placeholder links', () => {
    renderLandingPage();

    const links = Array.from(document.querySelectorAll('a'));
    expect(links.length).toBeGreaterThan(10);
    links.forEach((link) => expect(link.getAttribute('href')).not.toBe('#'));

    expect(document.querySelector('a[href="/app?initialState=signUp"]')).not.toBeNull();
    expect(document.querySelector('a[href="/app"]')).not.toBeNull();
    expect(document.querySelector('a[href="/blog"]')).not.toBeNull();

    const schedulerLink = document.querySelector('a[href^="https://scheduler.zoom.us/"]');
    expect(schedulerLink).not.toBeNull();
    expect(schedulerLink.getAttribute('target')).toBe('_blank');
    expect(schedulerLink.getAttribute('rel')).toContain('noopener');
  });

  test('defers heavy media and exposes accessible controls', () => {
    renderLandingPage();

    expect(document.querySelector('video').getAttribute('preload')).toBe('none');
    expect(document.querySelector('img[fetchpriority="high"]')).not.toBeNull();
    expect(document.querySelectorAll('img[loading="lazy"]').length).toBeGreaterThan(3);
    expect(document.querySelector('button[aria-controls="marketing-navigation"]')).not.toBeNull();
    expect(document.querySelectorAll('.marketing-faq__item button[aria-expanded="false"]')).toHaveLength(9);
  });
});
