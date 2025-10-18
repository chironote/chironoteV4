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

// Track recording completion and check for 5-recording milestone
export const trackRecordingCompleted = async (userId) => {
  const hasConsent = localStorage.getItem('cookieConsent') === 'true';
  
  if (hasConsent && userId) {
    // Track individual recording completion
    ReactGA.event('recording_completed', {
      user_id: userId
    });
    
    // Get current recording count from localStorage
    let recordingCount = parseInt(localStorage.getItem('total_recordings') || '0');
    recordingCount++;
    localStorage.setItem('total_recordings', recordingCount);
    
    // Update user property with new count
    ReactGA.set({ 
      user_properties: {
        total_recordings: recordingCount
      }
    });
    
    console.log(`[GA4] Recording completed. Total: ${recordingCount}`);
    
    // Fire milestone event when hitting exactly 5 recordings
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
export const trackSignUp = async (email, userId) => {
  const hasConsent = localStorage.getItem('cookieConsent') === 'true';
  
  if (hasConsent) {
    // Standard GA4 sign_up event (recommended event)
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
  }
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

// Track purchase completion (for future webhook integration)
export const trackPurchase = async (email, userId, planName, value) => {
  const hasConsent = localStorage.getItem('cookieConsent') === 'true';
  
  if (hasConsent) {
    // Standard GA4 purchase event
    ReactGA.event('purchase', {
      transaction_id: `${userId}_${Date.now()}`,
      value: value,
      currency: 'USD',
      user_email: email,
      user_id: userId,
      items: [{
        item_id: planName.toLowerCase(),
        item_name: `ChiroNote ${planName} Plan`,
        item_category: 'subscription',
        price: value,
        quantity: 1
      }]
    });
    
    // Also track with Meta Pixel if available
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', {
        value: value,
        currency: 'USD',
        content_name: `${planName} Plan`
      });
    }
  }
};
