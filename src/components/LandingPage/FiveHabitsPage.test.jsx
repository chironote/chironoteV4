import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import FiveHabitsPage from './FiveHabitsPage';

jest.mock('../../utils/analytics', () => ({
  trackLandingCta: jest.fn(),
  trackLandingNavigation: jest.fn(),
}));

describe('FiveHabitsPage', () => {
  test('provides the five chiropractic AI scribe habits and working demo and sign-up paths', () => {
    const markup = renderToStaticMarkup(<HelmetProvider><FiveHabitsPage /></HelmetProvider>);
    document.body.innerHTML = markup;

    expect(document.querySelectorAll('.five-habits-panel')).toHaveLength(5);
    expect(document.querySelector('h1').textContent).toContain('Five habits');
    expect(document.querySelector('a[href="/demo"]')).not.toBeNull();
    expect(document.querySelector('a[href="/app?initialState=signUp"]')).not.toBeNull();
    expect(document.querySelectorAll('.five-habits-art img[loading="lazy"]')).toHaveLength(4);
    expect(document.body.textContent).toContain('The free plan includes an hour of dictation a month');
  });
});
