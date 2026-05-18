import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { captureGclid, trackPageView } from '../../utils/analytics';

function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    captureGclid();

    ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search });

    const path = location.pathname;
    let descriptivePageName = '';

    if (path === '/') {
      descriptivePageName = 'LandingPage_View';
    } else if (path.startsWith('/app')) {
      descriptivePageName = 'App_Main_View';
    } else if (path.startsWith('/account')) {
      descriptivePageName = 'AccountPage_View';
    }

    if (descriptivePageName) {
      trackPageView(descriptivePageName);
      return;
    }

    const fallbackPageName = path.substring(1).replace(/\//g, '_') || 'UnknownPage_View';
    trackPageView(fallbackPageName.charAt(0).toUpperCase() + fallbackPageName.slice(1) + '_View');
  }, [location]);

  return null;
}

export default RouteTracker;
