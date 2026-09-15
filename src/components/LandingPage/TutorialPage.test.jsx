import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import TutorialPage from './TutorialPage';

jest.mock('../../utils/analytics', () => ({
  getAnalyticsConsent: jest.fn(() => false),
  trackAnalyticsEvent: jest.fn(),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

test('tracks an origin-validated confirmed booking from the tutorial scheduler', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => root.render(
    <HelmetProvider>
      <TutorialPage />
    </HelmetProvider>
  ));

  const scheduler = container.querySelector('#scheduler iframe');
  expect(scheduler).not.toBeNull();
  act(() => window.dispatchEvent(new MessageEvent('message', {
    origin: 'https://scheduler.zoom.us',
    source: scheduler.contentWindow,
    data: { type: 'bookingForm', payload: { scheduledEventId: 'tutorial-event-123' } },
  })));

  expect(require('../../utils/analytics').trackAnalyticsEvent).toHaveBeenCalledWith('booked_demo', {
    booking_channel: 'zoom_scheduler',
    zoom_scheduled_event_id: 'tutorial-event-123',
  });

  act(() => root.unmount());
  container.remove();
});
