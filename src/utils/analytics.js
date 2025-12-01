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

// Landing page button clicks
export const trackLandingPageButtonClick = (actionName) => {
  // actionName will be a descriptive string like 'Click_Header_SignIn'
  trackEvent('LandingPage', actionName);
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

// Account page button clicks
export const trackAccountPageButtonClick = (actionName) => {
  // actionName will be a descriptive string like 'Click_BrowsePlans'
  trackEvent('AccountPage', actionName);
};

// Video engagement tracking
// KEY CONVERSION EVENT - Always track regardless of consent
export const trackVideoProgress = (videoName, progressPercentage) => {
  // Fire GA4 event (no consent required for critical conversion events)
  ReactGA.event('VideoEngagement', {
    action: `Video_${progressPercentage}%_Watched`,
    label: videoName
  });
  
  // Also track with Meta Pixel if available
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'CustomEvent', {
      event_name: `Video_${progressPercentage}_Percent_Watched`,
      video_name: videoName
    });
  }
  
  console.log(`[GA4] Video engagement tracked (no consent required): ${progressPercentage}% of ${videoName}`);
};

// Track recording completion and check for 5-recording milestone
export const trackRecordingCompleted = async (userId) => {
  const hasConsent = localStorage.getItem('cookieConsent') === 'true';
  
  if (userId) {
    // Track individual recording completion (respects consent)
    if (hasConsent) {
      ReactGA.event('recording_completed', {
        user_id: userId
      });
    }
    
    // Get current recording count from localStorage
    let recordingCount = parseInt(localStorage.getItem('total_recordings') || '0');
    recordingCount++;
    localStorage.setItem('total_recordings', recordingCount);
    
    // Update user property with new count (respects consent)
    if (hasConsent) {
      ReactGA.set({ 
        user_properties: {
          total_recordings: recordingCount
        }
      });
    }
    
    console.log(`[GA4] Recording completed. Total: ${recordingCount}`);
    
    // Fire milestone event when hitting exactly 5 recordings
    // KEY CONVERSION EVENT - Always track regardless of consent
    if (recordingCount === 5) {
      ReactGA.event('user_activated_5times', {
        user_id: userId,
        milestone: '5_recordings',
        activation_type: 'power_user'
      });
      
      // Also track with Meta Pixel
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'CustomEvent', {
          event_name: 'User_Activated_5_Recordings',
          milestone: '5_recordings'
        });
      }
      
      console.log('[GA4] 🎉 User activated! 5 recordings milestone reached');
    }
  }
};

// Track milestone events (3 notes, 5 notes)
// KEY CONVERSION EVENTS - Always track regardless of consent
export const trackMilestone = async (eventName, userId, params = {}) => {
  // Fire GA4 event (no consent required for critical conversion events)
  ReactGA.event(eventName, {
    user_id: userId,
    ...params
  });
  
  // Also track with Meta Pixel if available
  if (typeof window.fbq === 'function') {
    const metaEventName = eventName === 'user_activated_3notes' 
      ? 'User_Activated_3_Notes' 
      : 'User_Activated_5_Notes';
    
    window.fbq('track', 'CustomEvent', {
      event_name: metaEventName,
      milestone: params.milestone
    });
  }
  
  console.log(`[GA4] Milestone event tracked (no consent required): ${eventName}`, params);
};

// ============================================
// CONVERSION TRACKING FOR GOOGLE ADS
// ============================================

// Helper function to hash email for enhanced conversions (privacy-safe)
const hashEmail = async (email) => {
  if (!email) return null;
  
  // Normalize email: lowercase and trim
  const normalizedEmail = email.toLowerCase().trim();
  
  // Use Web Crypto API to create SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedEmail);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
};

// Capture GCLID from URL and store in localStorage
// This ensures the ad click token is preserved even if user navigates around before signing up/purchasing
export const captureGclid = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get('gclid');
    
    if (gclid) {
      localStorage.setItem('gclid', gclid);
      // Also update expiration (Google Ads attribution window is usually 30-90 days)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90); 
      localStorage.setItem('gclid_expiry', expiryDate.toISOString());
      console.log('[Analytics] GCLID captured:', gclid);
    }
  } catch (error) {
    console.error('[Analytics] Error capturing GCLID:', error);
  }
};

// Retrieve valid GCLID from storage
export const getGclid = () => {
  try {
    const gclid = localStorage.getItem('gclid');
    const expiry = localStorage.getItem('gclid_expiry');
    
    if (!gclid || !expiry) return null;
    
    if (new Date() > new Date(expiry)) {
      localStorage.removeItem('gclid');
      localStorage.removeItem('gclid_expiry');
      return null;
    }
    
    return gclid;
  } catch (error) {
    return null;
  }
};

// Set user properties for enhanced tracking
export const setUserProperties = async (userId, email) => {
  const hasConsent = localStorage.getItem('cookieConsent') === 'true';
  
  if (hasConsent && userId) {
    // Set user_id for cross-session tracking
    ReactGA.set({ user_id: userId });
    
    // Set user properties including hashed email for enhanced conversions
    if (email) {
      const hashedEmail = await hashEmail(email);
      ReactGA.set({ 
        user_properties: {
          user_email_hash: hashedEmail,
          user_email: email // Store actual email for Make.com matching
        }
      });
    }
  }
};

// Track successful account creation (PRIMARY CONVERSION)
// KEY CONVERSION EVENT - Always tracks regardless of cookie consent
export const trackSignUp = async (email, userId) => {
  // Standard GA4 sign_up event (recommended event)
  // This is a critical business conversion that should always be tracked
  ReactGA.event('sign_up', {
    method: 'email',
    user_email: email,
    user_id: userId
  });
  
  // Also track with Meta Pixel if available
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'CompleteRegistration', {
      content_name: 'Account Creation',
      status: 'completed'
    });
  }
  
  console.log('[GA4] Sign-up conversion tracked (no consent required):', { email, userId });
};

// Track when user begins checkout process (views pricing table)
export const trackBeginCheckout = async (email, userId) => {
  const hasConsent = localStorage.getItem('cookieConsent') === 'true';
  
  if (hasConsent) {
    // Standard GA4 begin_checkout event
    ReactGA.event('begin_checkout', {
      user_email: email,
      user_id: userId,
      items: [{
        item_name: 'ChiroNote Subscription',
        item_category: 'subscription'
      }]
    });
  }
};

// Track when user views the pricing table (cart view)
// KEY CONVERSION EVENT - Always tracks regardless of cookie consent
export const trackViewedCart = (email, userId) => {
  ReactGA.event('viewedCart', {
    user_email: email,
    user_id: userId,
    content_type: 'pricing_table'
  });
  
  // Also track with Meta Pixel if available
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'ViewContent', {
      content_name: 'Pricing Table',
      content_category: 'Pricing'
    });
  }
  
  console.log('[GA4] Cart viewed (pricing table) tracked (no consent required):', { email, userId });
};
