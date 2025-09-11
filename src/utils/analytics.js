import ReactGA from 'react-ga4';

// Helper functions for tracking events in Google Analytics
export const trackEvent = (category, action, label = null, value = null) => {
  // Only track if cookies are accepted
  const hasConsent = localStorage.getItem('cookieConsent') === 'true';
  
  if (hasConsent) {
    ReactGA.event({
      category,
      action,
      ...(label && { label }),
      ...(value && { value }),
    });
  }
};

// App button clicks (formerly landing page)
export const trackAppButtonClick = (actionName) => {
  // actionName will be a descriptive string like 'Click_Header_SignIn'
  trackEvent('App', actionName);
};

// Recording actions
export const trackRecordingStart = () => {
  trackEvent('Recording', 'Start_Recording');
};

// Navigation 
export const trackPageView = (pageName) => {
  trackEvent('Navigation', 'Page_View', pageName);
};

// Note editing
export const trackApplyChanges = () => {
  trackEvent('Editing', 'Apply_Changes');
};

// Dictation
export const trackDictationStart = () => {
  trackEvent('Dictation', 'Start_Dictation');
};

// Account page interactions
export const trackAccountPageInteraction = (actionName) => {
  // actionName will be a descriptive string like 'View_Usage_Summary'
  trackEvent('AccountPage', actionName);
};
