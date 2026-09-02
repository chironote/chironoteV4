import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  captureGoogleAdsClickId,
  initializeAnalytics,
  trackRoutePageView,
  trackWebVital,
} from '../../utils/analytics';

let webVitalsStarted = false;

const getPageType = (pathname) => {
  if (pathname === '/') return 'landing';
  if (pathname === '/demo') return 'demo_landing';
  if (pathname.startsWith('/app')) return 'application';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname === '/tutorial') return 'tutorial';
  return 'public';
};

const startWebVitals = () => {
  if (webVitalsStarted) return;
  webVitalsStarted = true;

  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(trackWebVital);
    getFID(trackWebVital);
    getFCP(trackWebVital);
    getLCP(trackWebVital);
    getTTFB(trackWebVital);
  }).catch(() => {
    // Performance reporting is diagnostic and must never affect navigation.
  });
};

export default function GoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    initializeAnalytics();
    startWebVitals();
  }, []);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    captureGoogleAdsClickId();
    trackRoutePageView({
      path,
      title: document.title,
      pageType: getPageType(location.pathname),
    });
  }, [location.pathname, location.search]);

  return null;
}
