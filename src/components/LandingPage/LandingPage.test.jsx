import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import LandingPage from './LandingPage';

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

const renderLandingPage = (variant) => {
  const markup = renderToStaticMarkup(
    <HelmetProvider>
      <LandingPage variant={variant} />
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

    expect(document.querySelector('a[href^="https://scheduler.zoom.us/"]')).toBeNull();
  });

  test('uses concise hero copy without a desktop image overlay', () => {
    renderLandingPage();

    expect(document.querySelector('h1').textContent).toContain('SOAP notes');
    expect(document.querySelector('h1').textContent).toContain('written while you treat');
    expect(document.querySelector('.marketing-hero__summary').textContent).toBe(
      'ChiroNote listens to the visit and turns the conversation into a structured note—automatically.'
    );
    expect(document.querySelector('.marketing-hero__note-card')).toBeNull();
    expect(document.body.textContent).not.toContain('45%');
  });

  test('uses portrait-led testimonial cards and restrained reveal hooks across key sections', () => {
    renderLandingPage();

    expect(document.querySelectorAll('.marketing-testimonial__portrait img')).toHaveLength(3);
    expect(document.querySelectorAll('[data-marketing-reveal]')).toHaveLength(15);
    expect(document.querySelectorAll('.marketing-features [data-marketing-reveal]')).toHaveLength(5);
    expect(document.querySelectorAll('.marketing-plan[data-marketing-reveal]')).toHaveLength(3);
    expect(document.querySelector('.marketing-final-cta[data-marketing-reveal]')).not.toBeNull();
  });

  test('provides compact mobile assurances inside the hero image', () => {
    renderLandingPage();

    const assurances = Array.from(document.querySelectorAll('.marketing-hero__mobile-assurances li'));
    expect(assurances.map((item) => item.textContent.trim())).toEqual([
      'HIPAA-compliant',
      'Quick setup',
      'Keep your workflow',
    ]);
    expect(document.querySelector('.marketing-hero__mobile-assurances').dataset.analyticsSection).toBe('trust');
  });

  test('groups pricing plans into one compact mobile comparison', () => {
    renderLandingPage();

    const pricing = document.querySelector('.marketing-pricing__grid');
    expect(pricing.querySelectorAll('.marketing-plan')).toHaveLength(3);
    expect(pricing.querySelectorAll('.marketing-button--plan')).toHaveLength(3);
    expect(pricing.querySelector('.marketing-pricing__shared-feature').textContent).toBe(
      'All plans include unlimited devices.'
    );
  });

  test('defers heavy media and exposes accessible controls', () => {
    renderLandingPage();

    expect(document.querySelector('video').getAttribute('preload')).toBe('none');
    expect(document.querySelector('img[fetchpriority="high"]')).not.toBeNull();
    expect(document.querySelectorAll('img[loading="lazy"]').length).toBeGreaterThan(3);
    expect(document.querySelector('button[aria-controls="marketing-navigation"]')).not.toBeNull();
    expect(document.querySelectorAll('.marketing-faq__item button[aria-expanded="false"]')).toHaveLength(9);
  });

  test('keeps the HIPAA trust signal concise and explains provider BAAs in the FAQ', () => {
    renderLandingPage('demo');

    const hipaaFaq = Array.from(document.querySelectorAll('.marketing-faq__item'))
      .find((item) => item.textContent.includes('Is ChiroNote HIPAA compliant?'));

    expect(document.querySelector('.marketing-trust')).toBeNull();
    expect(document.querySelector('.marketing-hipaa-trust__icon').getAttribute('src')).toContain('hipaa.svg');
    expect(document.querySelector('.marketing-hipaa-trust').textContent).toContain('HIPAA-ready clinical workflow');
    expect(document.querySelector('.marketing-hipaa-trust').textContent).not.toContain('Business Associate Agreements');
    expect(hipaaFaq.textContent).toContain('All service providers with access to protected health information are covered by Business Associate Agreements with ChiroNote.');
    expect(document.body.textContent).not.toContain('Can we discuss a Business Associate Agreement (BAA)?');
    expect(document.querySelectorAll('.marketing-faq__item button[aria-expanded="false"]')).toHaveLength(9);
  });
});
