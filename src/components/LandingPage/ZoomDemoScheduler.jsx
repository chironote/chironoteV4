import React, { useEffect, useRef, useState } from 'react';
import { getAnalyticsConsent, trackAnalyticsEvent } from '../../utils/analytics';
import { trackMetaScheduledDemo } from '../../utils/metaPixel';

const SCHEDULER_URL = 'https://scheduler.zoom.us/nikita-predtechensky/chironote-demo';
const SCHEDULER_ORIGIN = 'https://chironote.ai';
const ZOOM_SCHEDULER_ORIGIN = 'https://scheduler.zoom.us';

const createSchedulerUrl = () => {
  const schedulerUrl = new URL(SCHEDULER_URL);
  schedulerUrl.searchParams.set('embed', 'true');
  schedulerUrl.searchParams.set('origin', SCHEDULER_ORIGIN);
  return schedulerUrl.toString();
};

export default function ZoomDemoScheduler({ className, title = 'Schedule a Demo with ChiroNote', loading = 'lazy' }) {
  const schedulerRef = useRef(null);
  const trackedBookings = useRef(new Set());
  const [schedulerUrl] = useState(createSchedulerUrl);

  useEffect(() => {
    const handleSchedulerBooking = (event) => {
      if (event.origin !== ZOOM_SCHEDULER_ORIGIN) return;
      if (event.source !== schedulerRef.current?.contentWindow) return;

      const { type, payload } = event.data || {};
      const scheduledEventId = payload?.scheduledEventId;
      if (type !== 'bookingForm' || typeof scheduledEventId !== 'string' || !scheduledEventId) return;
      if (trackedBookings.current.has(scheduledEventId)) return;

      trackedBookings.current.add(scheduledEventId);
      trackAnalyticsEvent('booked_demo', {
        booking_channel: 'zoom_scheduler',
        zoom_scheduled_event_id: scheduledEventId,
      });
      trackMetaScheduledDemo(scheduledEventId, getAnalyticsConsent() === true);
    };

    window.addEventListener('message', handleSchedulerBooking);
    return () => window.removeEventListener('message', handleSchedulerBooking);
  }, []);

  return (
    <iframe
      ref={schedulerRef}
      className={className}
      src={schedulerUrl}
      title={title}
      loading={loading}
    />
  );
}
