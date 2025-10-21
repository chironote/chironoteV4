# Tracking Documentation

This document outlines the tracking implementation across ChiroNote's marketing funnels and application pages.

---

## 1. LandingPage.jsx (Demo-Oriented Landing Page)

**File Location:** `src/components/LandingPage/LandingPage.jsx`

**Purpose:** Primary marketing landing page for ChiroNote, designed to convert visitors into trial users or demo bookings.

### Conversion Points

The following conversion events are currently tracked on the landing page:

#### Primary Conversions
1. **Sign Up / Try Free** - Multiple CTAs throughout the page
   - Hero section "Try Now for Free" button
   - Video section "Try Now for Free" button
   - Pricing section "Try Now for Free" button

2. **Book Demo** - Consultation booking
   - Hero section "Book my Tour" button

#### Secondary Conversions
3. **Sign In** - Existing user authentication
   - Header "Sign In" button (desktop)
   - Mobile navigation "Sign In" button

---

### Google Analytics (GA4)

**Implementation:** Uses `react-ga4` library via centralized analytics utility

**Utility File:** `src/utils/analytics.js`

#### GA4 Configuration Reference

| Configuration Item | ID / Value | Location | Notes |
|-------------------|------------|----------|-------|
| **Measurement ID** | `G-02117DNZDH` | `src/index.js` (line 17)<br>`src/components/CookieConsent/CookieConsent.jsx` (line 34) | Primary GA4 tracking ID |
| **Property ID** | *[NEEDED]* | GA4 Admin → Property Settings | Numeric ID (e.g., 123456789) |
| **Stream ID** | *[NEEDED]* | GA4 Admin → Data Streams → Web Stream | Numeric stream identifier |
| **Meta Pixel ID** | `3249774745170747` | `public/index.html` (line 61) | Facebook/Meta tracking pixel |

**Key Conversion Events (No Consent Required):**
- ✅ `sign_up` - Account creation (PRIMARY CONVERSION)
- ✅ `user_activated_5times` - 5 recordings milestone (SECONDARY CONVERSION)

**Standard Events (Consent Required):**
- `recording_completed` - Individual recording tracking
- `begin_checkout` - Pricing table views
- Landing page button clicks
- User property updates

#### Core Tracking Function

```javascript
export const trackLandingPageButtonClick = (actionName) => {
  // actionName will be a descriptive string like 'Click_Header_SignIn'
  trackEvent('LandingPage', actionName);
};
```

#### Event Structure

All landing page events follow this structure:
- **Category:** `'LandingPage'`
- **Action:** Descriptive action name (see list below)
- **Consent Check:** Only tracks if `localStorage.getItem('cookieConsent') === 'true'`

#### Tracked Events

| Event Action | Trigger | Line | Description |
|-------------|---------|------|-------------|
| `Click_Landing_Header_SignIn` | Header "Sign In" button click | 248 | User clicks sign in from desktop header |
| `Click_Landing_MobileNav_SignIn` | Mobile nav "Sign In" button click | 264 | User clicks sign in from mobile menu |
| `Click_Landing_Hero_BookDemo` | Hero "Book my Tour" button click | 291 | User clicks demo booking CTA in hero section |
| `Click_Landing_Hero_TryFree` | Hero "Try Now for Free" button click | 301 | User clicks free trial CTA in hero section |
| `Click_Landing_Video_SignUp` | Video section "Try Now for Free" button click | 450 | User clicks free trial CTA after video |
| `Click_Landing_Pricing_SignUp` | Pricing section "Try Now for Free" button click | 542 | User clicks free trial CTA in pricing section |

#### Implementation Pattern

```javascript
const handleButtonClick = (actionName) => {
  trackLandingPageButtonClick(actionName); // Google Analytics tracking
  
  // Meta Pixel Tracking (see Meta section below)
  if (typeof window.fbq === 'function') {
    // Meta tracking logic...
  }
};
```

#### Usage Example

```javascript
<a 
  href="/app?initialState=signUp" 
  className="landing-page__try-free-button"
  onClick={() => handleButtonClick('Click_Landing_Hero_TryFree')}
>
  Try Now for Free
</a>
```

---

### Meta Pixel (Facebook Ads)

**Implementation:** Direct `window.fbq()` calls to Meta Pixel API

**Pixel Loading:** Assumed to be loaded via script in `public/index.html` or similar

#### Page View Tracking

Tracks page view on component mount:

```javascript
useEffect(() => {
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'PageView');
    // Also track a custom landing page view event
    window.fbq('track', 'ViewContent', {
      content_name: 'Landing Page',
      content_category: 'Marketing Page'
    });
  }
}, []);
```

**Events Fired:**
- `PageView` - Standard Meta page view event
- `ViewContent` - Custom event with metadata
  - `content_name: 'Landing Page'`
  - `content_category: 'Marketing Page'`

**Location:** Lines 121-130

#### Conversion Event Mapping

Meta Pixel events are triggered within the `handleButtonClick` function:

```javascript
const handleButtonClick = (actionName) => {
  trackLandingPageButtonClick(actionName); // Google Analytics tracking

  // Meta Pixel Tracking
  if (typeof window.fbq === 'function') {
    if (actionName === 'Click_Landing_Hero_SignUp' || 
        actionName === 'Click_Landing_Pricing_SignUp' || 
        actionName === 'Click_Landing_Video_SignUp') {
      window.fbq('track', 'StartTrial');
    } else if (actionName === 'Click_Landing_Hero_BookDemo') {
      window.fbq('track', 'Contact');
    }
  }
};
```

**Location:** Lines 132-143

#### Tracked Meta Events

| Meta Event | Trigger Conditions | GA4 Action Names | Description |
|-----------|-------------------|------------------|-------------|
| `PageView` | Component mount | N/A | Standard page view |
| `ViewContent` | Component mount | N/A | Landing page view with metadata |
| `StartTrial` | Sign up button clicks | `Click_Landing_Hero_SignUp`<br>`Click_Landing_Pricing_SignUp`<br>`Click_Landing_Video_SignUp` | User initiates free trial |
| `Contact` | Demo booking button click | `Click_Landing_Hero_BookDemo` | User clicks to book demo |

#### Implementation Notes

1. **Safety Check:** All Meta tracking includes `typeof window.fbq === 'function'` check to prevent errors if pixel isn't loaded
2. **Event Consolidation:** Multiple GA4 actions map to single Meta events (e.g., all "Try Free" buttons → `StartTrial`)
3. **Standard Events:** Uses Meta's standard event names (`StartTrial`, `Contact`) for optimal ad optimization

---

### Engagement Tracking (Planned - Not Yet Implemented)

The following engagement points have been identified and commented in the code as potential conversion indicators. These are **NOT yet tracked** in GA4 or Meta Pixel but have TODO comments in place for future implementation.

#### Video Engagement

**Location:** Lines 431-435 in `LandingPage.jsx`

**Potential Events:**
- `Play_Demo_Video` - User starts watching the demo video
- `Pause_Demo_Video` - User pauses the video
- `Complete_Demo_Video` - User watches video to completion

**Implementation Notes:**
```javascript
// Add to video element:
onPlay={() => trackEvent('LandingPage', 'Play_Demo_Video')}
onPause={() => trackEvent('LandingPage', 'Pause_Demo_Video')}
onEnded={() => trackEvent('LandingPage', 'Complete_Demo_Video')}
```

**Why Track This:** Video engagement is a strong conversion indicator. Users who watch the demo video are more likely to sign up.

**Meta Pixel Consideration:** Could map to custom `VideoView` event or enhance `ViewContent` with video engagement data.

---

#### Section Navigation

**Location:** Lines 159-161 in `LandingPage.jsx` (`handleNavClick` function)

**Potential Events:**
- `View_Landing_how-it-works` - User navigates to video section
- `View_Landing_faq` - User navigates to FAQ section
- `View_Landing_prices` - User navigates to pricing section
- `View_Landing_scheduler` - User navigates to scheduler section

**Implementation Notes:**
```javascript
// Add to handleNavClick function:
trackEvent('LandingPage', `View_Landing_${sectionId}`)
```

**Why Track This:** Understanding which sections users actively navigate to helps identify what information is most important to prospects.

**Meta Pixel Consideration:** Could map to `ViewContent` events with section-specific metadata.

---

#### FAQ Engagement

**Location:** Lines 172-174 in `LandingPage.jsx` (`toggleFaqItem` function)

**Potential Events:**
- `Expand_FAQ_Item` - User expands a specific FAQ question

**Implementation Notes:**
```javascript
// Add to toggleFaqItem function:
trackEvent('LandingPage', 'Expand_FAQ_Item', FAQ_ITEMS[index].question)
```

**Why Track This:** FAQ engagement reveals user concerns and objections. Tracking which questions are most viewed helps refine messaging and identify common barriers to conversion.

**Meta Pixel Consideration:** Could map to custom `FAQEngagement` event or enhance `ViewContent` with FAQ-specific data.

---

### Currently Untracked Interactions

The following interactions are **NOT commented** in the code and are not currently planned for tracking:

- Testimonial carousel interactions (next/prev arrows, dot navigation)
- Mobile menu open/close
- Scroll depth tracking
- Time on page
- Exit intent
- Scheduler widget interactions

---

### Technical Implementation Details

#### Event Handler Flow

1. User clicks tracked element
2. `handleButtonClick(actionName)` is called with descriptive action name
3. Function calls `trackLandingPageButtonClick(actionName)` for GA4
4. Function checks action name and fires appropriate Meta Pixel event
5. Browser navigates to destination (if link) or scrolls to section (if button)

#### Consent Management

- GA4 tracking respects cookie consent via `localStorage.getItem('cookieConsent') === 'true'`
- Meta Pixel tracking does NOT currently check consent (potential compliance issue)
- Consent check implemented in `src/utils/analytics.js` `trackEvent()` function

#### URL Parameters

Sign-up links include `?initialState=signUp` query parameter to trigger sign-up modal on app load.

---

## 2. App.jsx (Authenticated Application)

**File Location:** `src/App.jsx`

**Purpose:** Main application component that handles authenticated user experience.

### Conversion Points

#### Account Creation (Critical Conversion)

**Location:** Lines 379-390 in `App.jsx`

**Event Type:** Authentication success tracking

**Potential Events:**
- `Create_Account_Success` - User successfully completes account registration

**Implementation Notes:**
```javascript
// Add auth event listener in useEffect:
useEffect(() => {
  const authListener = Hub.listen('auth', (data) => {
    const { payload } = data;
    if (payload.event === 'signUp') {
      // Track successful account creation
      trackEvent('Authentication', 'Create_Account_Success');
      // Meta Pixel: window.fbq('track', 'CompleteRegistration');
    }
  });
  return () => authListener();
}, []);
```

**Why Track This:** Account creation is the primary conversion goal from the landing page. This is the most critical conversion event to track for measuring marketing effectiveness.

**Meta Pixel Consideration:** Maps to Meta's standard `CompleteRegistration` event, which is essential for conversion tracking and optimization.

**Technical Details:**
- Uses AWS Amplify Hub to listen for authentication events
- The `signUp` event fires after successful account creation
- Should be implemented in the `AuthenticatedApp` component where Hub is already imported
- Requires importing `trackEvent` from `src/utils/analytics.js`

---

## 3. Account.jsx (Account Management Page)

**File Location:** `src/components/Account/Account.jsx`

**Purpose:** User account management page displaying subscription plans and usage statistics.

### Conversion Points

#### View Price Tables

**Location:** Lines 30-33 in `Account.jsx`

**Event Type:** Engagement tracking for upgrade consideration

**Potential Events:**
- `View_Price_Tables` - User views pricing comparison on account page

**Implementation Notes:**
```javascript
// Add to existing useEffect that tracks page view:
useEffect(() => {
  trackPageView('Account_Page');
  
  // Track price table view for conversion funnel analysis
  trackEvent('AccountPage', 'View_Price_Tables');
  // Meta Pixel: window.fbq('track', 'ViewContent', { 
  //   content_name: 'Pricing Tables', 
  //   content_category: 'Account Page' 
  // });
  
  // ... rest of useEffect
}, [setCurrentPage]);
```

**Why Track This:** Users viewing the pricing tables on the account page are actively considering an upgrade or plan change. This is a strong indicator of purchase intent and helps identify users in the consideration phase of the conversion funnel.

**Meta Pixel Consideration:** Maps to `ViewContent` event with pricing-specific metadata to track users evaluating upgrade options.

**Current Tracking:**
- Page view already tracked: `trackPageView('Account_Page')` (line 28)
- Button clicks already tracked:
  - `Click_Account_BrowsePlans` - Free users clicking to view full pricing page (line 75)
  - `Click_Account_ManageBilling` - Paid users accessing billing portal (line 78)

**Related Conversion Flow:**
1. User views price tables on Account page → `View_Price_Tables`
2. Free user clicks "Browse Available Plans" → `Click_Account_BrowsePlans` (already tracked)
3. User navigates to `/app/pricingplans` for detailed comparison
4. User initiates upgrade/purchase

---

## Future Enhancements

### Recommended Additions

1. **Meta Pixel Consent Check:** Add consent verification before Meta tracking
2. **Video Engagement:** Track video play, pause, completion percentage
3. **Scroll Depth:** Track how far users scroll on landing page
4. **FAQ Engagement:** Track which FAQ items are most viewed
5. **Time on Page:** Track engagement duration
6. **Form Interactions:** Track scheduler widget interactions
7. **Exit Intent:** Track when users are about to leave
8. **A/B Test Integration:** Add experiment tracking capabilities

### Event Naming Convention

**Current Conventions:**

**Landing Page Events:**
- Pattern: `Click_Landing_[Section]_[Action]`
- Examples:
  - `Click_Landing_Hero_TryFree`
  - `Click_Landing_Header_SignIn`
  - `Click_Landing_Pricing_SignUp`

**Account Page Events:**
- Pattern: `Click_Account_[Action]`
- Examples:
  - `Click_Account_BrowsePlans`
  - `Click_Account_ManageBilling`

**Authentication Events:**
- Pattern: `[Action]_[Status]`
- Example: `Create_Account_Success`

**Engagement Events:**
- Pattern: `[Action]_[Target]`
- Examples:
  - `Play_Demo_Video`
  - `View_Price_Tables`
  - `Expand_FAQ_Item`

**Recommendation:** Maintain these conventions for consistency when adding new events.

---

## Related Files

### Core Files
- **Analytics Utility:** `src/utils/analytics.js` - Centralized GA4 tracking functions
- **Main App:** `src/App.jsx` - Authentication and main app logic

### Page Components
- **Landing Page:** `src/components/LandingPage/LandingPage.jsx` - Marketing landing page
- **Account Page:** `src/components/Account/Account.jsx` - Account management and pricing

### Styles
- **Landing Page Styles:** `src/components/LandingPage/LandingPage.css`
- **Account Page Styles:** `src/components/Account/Account.css`

---

## Testing Checklist

### General Testing
- [ ] Verify GA4 events appear in GA4 DebugView
- [ ] Verify Meta Pixel events appear in Meta Events Manager Test Events
- [ ] Test with cookie consent accepted
- [ ] Test with cookie consent rejected (GA4 should not fire)
- [ ] Check browser console for tracking errors

### Landing Page Testing
- [ ] Test all CTA buttons (6 tracked events)
- [ ] Test on mobile and desktop viewports
- [ ] Verify URL parameters are preserved on navigation
- [ ] Test navigation clicks (FAQ, Video, Pricing sections)
- [ ] Test video engagement (play, pause, complete)
- [ ] Test FAQ item expansion

### Account Page Testing
- [ ] Verify page view tracking on Account page load
- [ ] Test "Browse Available Plans" button (free users)
- [ ] Test "Manage Billing" button (paid users)
- [ ] Verify price table view tracking

### Authentication Testing
- [ ] Test account creation event fires on successful sign-up
- [ ] Verify `CompleteRegistration` Meta Pixel event
- [ ] Test that event only fires once per registration

---

## 4. CONVERSION TRACKING FOR GOOGLE ADS (Make.com Integration)

**File Location:** `src/utils/analytics.js` (lines 50-161)

**Purpose:** Track account creation and purchase funnel for Google Ads conversion optimization using Make.com for Stripe webhook integration.

### Architecture Overview

**Frontend Tracking:**
- GA4 tracks user sign-ups and checkout begins with email
- User properties set on login (user_id, hashed email)
- Email sent with all conversion events

**Make.com Integration:**
- Listens to Stripe webhooks for payment completions
- Matches Stripe email with GA4 user email
- Sends conversion data to Google Ads API
- Handles conversion attribution automatically

### Conversion Events Implemented

#### A. Account Creation (PRIMARY CONVERSION)

**Event Name:** `sign_up` (standard GA4 event)

**Location:** Tutorial launch logic (triggered by localStorage)

**Trigger:** When the tutorial/onboarding tour launches for the first time

**Challenge:** AWS Amplify's `withAuthenticator` HOC does not expose the `signUp` Hub event reliably, and the auth flow happens before the main app component mounts. This creates a timing issue where Hub listeners miss the sign-up event.

**Solution:** Fire the `sign_up` GA4 event at the same time the tutorial launches (controlled by localStorage), but with a critical database check first.

**Implementation Plan:**

1. **Tutorial Launch Detection:**
   - The tutorial is triggered by checking localStorage (e.g., `localStorage.getItem('hasSeenTutorial')`)
   - When tutorial launches, this indicates a new user's first session

2. **Database Check (CRITICAL):**
   - Before firing the GA4 event, query the subscription table
   - Check if `eventFired` field equals `false`
   - **If `eventFired === true`:** Do NOT fire the GA4 event (already tracked)
   - **If `eventFired === false`:** Fire the GA4 event and update `eventFired` to `true`

3. **Event Flow:**
   ```javascript
   // Pseudocode - NOT YET IMPLEMENTED
   useEffect(() => {
     const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
     
     if (!hasSeenTutorial) {
       // Check subscription table
       const subscription = await fetchUserSubscription(userId);
       
       if (subscription.eventFired === false) {
         // Fire GA4 sign_up event
         await trackSignUp(email, userId);
         
         // Update database to prevent duplicate firing
         await updateSubscription(userId, { eventFired: true });
       }
       
       // Launch tutorial
       startTutorial();
     }
   }, []);
   ```

4. **Database Schema Requirement:**
   - Subscription table must have `eventFired` field (Boolean, default: false)
   - This field prevents duplicate GA4 events if user clears localStorage

**Event Parameters:**
- `method: 'email'`
- `user_email: [user email address]`
- `user_id: [Cognito user ID]`

**Meta Pixel:** Also fires `CompleteRegistration` event

**Make.com Matching:** Email sent to GA4 for matching with future Stripe purchases

**Why This Approach:**
- Tutorial launch is a reliable indicator of first-time user
- Database check prevents duplicate events (more reliable than localStorage alone)
- Avoids timing issues with Amplify's auth flow
- Works regardless of when the main app component mounts

---

#### B. Begin Checkout

**Event Name:** `begin_checkout` (standard GA4 e-commerce event)

**Location:** `src/components/Account/PriceTable.jsx` lines 27-29

**Trigger:** When user views Stripe pricing table on `/app/pricingplans`

**Implementation:**
```javascript
useEffect(() => {
  const getUserEmail = async () => {
    const userAttributes = await fetchUserAttributes();
    const email = userAttributes.email;
    const userId = userAttributes.sub;
    
    await trackBeginCheckout(email, userId);
  };
  getUserEmail();
}, []);
```

**Event Parameters:**
- `user_email: [user email address]`
- `user_id: [Cognito user ID]`
- `items: [{ item_name: 'ChiroNote Subscription', item_category: 'subscription' }]`

**Purpose:** Track checkout funnel drop-off and optimize for users who view pricing but don't purchase

---

#### C. Purchase Completion (Future: Stripe Webhook → Make.com)

**Event Name:** `purchase` (standard GA4 e-commerce event)

**Tracking Method:** Stripe webhook → Make.com → Google Ads API

**Not tracked in frontend code** - handled server-side via Make.com

**Make.com Workflow:**
1. Stripe fires `checkout.session.completed` webhook
2. Make.com receives webhook with customer email and payment details
3. Make.com sends conversion to Google Ads Conversion API
4. Google matches email with GA4 session for attribution

**Event Parameters (from Make.com):**
- `transaction_id: [Stripe payment ID]`
- `value: [19 or 75]`
- `currency: 'USD'`
- `user_email: [Stripe customer email]`
- `items: [plan details]`

---

### User Identification & Enhanced Conversions

**Location:** `src/App.jsx` lines 381-399

**Purpose:** Set user properties on login for cross-session tracking and enhanced conversion matching

**Implementation:**
```javascript
useEffect(() => {
  const setUserData = async () => {
    const userAttributes = await fetchUserAttributes();
    const email = userAttributes.email;
    const userId = userAttributes.sub;
    
    await setUserProperties(userId, email);
  };
  setUserData();
}, [user.username]);
```

**User Properties Set:**
1. **user_id:** Cognito user ID (enables cross-session tracking)
2. **user_email_hash:** SHA-256 hashed email (privacy-safe enhanced conversions)
3. **user_email:** Plain email (for Make.com matching)

**Email Hashing:**
- Uses Web Crypto API (SHA-256)
- Normalizes email (lowercase, trim) before hashing
- Compliant with privacy regulations

---

### Tracking Functions Reference

**File:** `src/utils/analytics.js`

#### Core Functions

**`setUserProperties(userId, email)`** - Lines 71-90
- Sets GA4 user_id and email properties
- Called on user login
- Enables enhanced conversions

**`trackSignUp(email, userId)`** - Lines 92-112
- Tracks account creation conversion
- Standard GA4 `sign_up` event
- Includes Meta Pixel `CompleteRegistration`

**`trackBeginCheckout(email, userId)`** - Lines 114-129
- Tracks pricing table views
- Standard GA4 `begin_checkout` event
- Helps measure checkout funnel

**`trackPurchase(email, userId, planName, value)`** - Lines 131-161
- Available for future direct purchase tracking
- Currently handled by Make.com webhook
- Standard GA4 `purchase` event with e-commerce data

---

### Make.com Integration Setup

**Required Make.com Modules:**

1. **Webhook Trigger**
   - Listen to Stripe `checkout.session.completed` events
   - Capture customer email and payment details

2. **Data Transformer**
   - Extract email, amount, plan name
   - Format for Google Ads API

3. **Google Ads Converter**
   - Send conversion to Google Ads
   - Use customer email for matching
   - Map to conversion action ID

**Matching Logic:**
- Google Ads matches Stripe email with GA4 session email
- Attribution window: 30 days (configurable)
- Handles click → signup → purchase journey

---

### Google Ads Conversion Actions Setup

**Required Conversion Actions in Google Ads:**

1. **Account Creation**
   - Name: "ChiroNote Sign Up"
   - Category: Sign-up
   - Value: Optional (could set to average customer lifetime value)
   - Attribution: Last click
   - Conversion window: 30 days

2. **Purchase (via Make.com)**
   - Name: "ChiroNote Purchase"
   - Category: Purchase
   - Value: Transaction-specific (from Stripe)
   - Attribution: Last click
   - Conversion window: 30 days
   - Source: API (Make.com)

---

### Testing & Verification

#### Frontend Testing

**1. Sign-Up Tracking**
```javascript
// Open browser console
// Complete sign-up flow
// Look for: "[GA4] Sign-up conversion tracked: { email: '...', userId: '...' }"
```

**2. Begin Checkout Tracking**
```javascript
// Navigate to /app/pricingplans
// Look for: "[GA4] Begin checkout tracked: { email: '...', userId: '...' }"
```

**3. User Properties**
```javascript
// After login, check console
// Look for: "[GA4] User properties set: { userId: '...', email: '...' }"
```

#### GA4 DebugView Verification

1. Enable GA4 DebugView in Chrome: `chrome://extensions` → Enable debug mode
2. Open GA4 → Configure → DebugView
3. Perform actions and verify events appear:
   - `sign_up` with email parameter
   - `begin_checkout` with email parameter
   - User properties: `user_id`, `user_email`

#### Make.com Testing

1. Test Stripe webhook in Stripe Dashboard → Developers → Webhooks
2. Send test event: `checkout.session.completed`
3. Verify Make.com receives event
4. Check Make.com logs for Google Ads API response
5. Verify conversion appears in Google Ads → Conversions

---

### Privacy & Compliance

**Cookie Consent:**
- All tracking respects `localStorage.getItem('cookieConsent') === 'true'`
- No events fired without user consent

**Email Handling:**
- Hashed with SHA-256 for enhanced conversions (privacy-safe)
- Plain email sent only with explicit consent
- Complies with GDPR/CCPA requirements

**Data Retention:**
- GA4: 2 months default (configurable to 14 months)
- User-level data: Respects GA4 retention settings
- Can be deleted via GA4 User Deletion API

---

## 5. PRODUCT USAGE TRACKING (Recording Completion & Activation)

**File Location:** `src/utils/analytics.js` (lines 50-93)

**Purpose:** Track core product usage to measure activation, retention, and optimize for quality users who actually use the product.

### Events Tracked

#### A. Recording Completion (Individual Event)

**Event Name:** `recording_completed`

**Location:** `src/App.jsx` lines 287-306 (`handleTextStreamUpdate` function)

**Trigger:** When user completes a recording and note generation finishes

**Implementation:**
```javascript
const handleTextStreamUpdate = useCallback(async (newText) => {
  const cleanedText = stripMarkdown(newText);
  setStreamingText(cleanedText);
  setClipboardContent(cleanedText);
  
  // Track recording completion for GA4
  if (newText && newText.length > 50) {
    const userAttributes = await fetchUserAttributes();
    const userId = userAttributes.sub;
    await trackRecordingCompleted(userId);
  }
}, []);
```

**Event Parameters:**
- `user_id: [Cognito user ID]`

**User Properties Updated:**
- `total_recordings: [incremented count]`

**Storage:** Recording count stored in `localStorage` as `total_recordings`

**Why Track This:**
- Measures actual product usage vs just sign-ups
- Tracks engagement frequency
- Identifies active vs inactive users
- Predicts retention and churn

---

#### B. Early Activation Milestone (2 Recordings)

**Event Name:** `user_activated_2times` (EARLY ENGAGEMENT CONVERSION)

**Location:** `src/utils/analytics.js`

**Trigger:** Automatically fires when user completes their 2nd **FINAL** recording

**Purpose:** Track users who move beyond initial trial and demonstrate early product adoption. This is a leading indicator for future retention and helps optimize for users who are likely to become power users.

**CRITICAL REQUIREMENT:** Must only fire on **completed recordings**, NOT on:
- Streaming chunks during note generation
- Partial recordings
- Intermediate text updates
- Any non-final recording state

**Implementation Plan:**

1. **isFinal Flag (REQUIRED):**
   - `trackRecordingCompleted(userId, isFinal)` must accept an `isFinal` boolean parameter
   - Only increment count and check milestone when `isFinal === true`
   - Prevents firing on stream chunks or partial updates

2. **Database Check (CRITICAL):**
   - Before firing the GA4 event, query the subscription table
   - Check if `userActivated2` field equals `false`
   - **If `userActivated2 === true`:** Do NOT fire the GA4 event (already tracked)
   - **If `userActivated2 === false`:** Fire the GA4 event and update `userActivated2` to `true`

3. **Dual Tracking (localStorage + Database):**
   - LocalStorage tracks count for UI/UX purposes
   - Database `userActivated2` prevents duplicate GA4 events
   - Database is source of truth for event firing

**Implementation:**
```javascript
// Pseudocode - NOT YET IMPLEMENTED
export const trackRecordingCompleted = async (userId, isFinal = false) => {
  // Only track completed recordings, not stream chunks
  if (!isFinal) {
    return; // Exit early if not a final recording
  }
  
  // Track individual completion
  ReactGA.event('recording_completed', { user_id: userId });
  
  // Increment count in localStorage
  let recordingCount = parseInt(localStorage.getItem('total_recordings') || '0');
  recordingCount++;
  localStorage.setItem('total_recordings', recordingCount);
  
  // Update user property
  ReactGA.set({ user_properties: { total_recordings: recordingCount } });
  
  // Fire 2-recording milestone event
  if (recordingCount === 2) {
    // Check database to prevent duplicate firing
    const subscription = await fetchUserSubscription(userId);
    
    if (subscription.userActivated2 === false) {
      // Fire GA4 event
      ReactGA.event('user_activated_2times', {
        user_id: userId,
        milestone: '2_recordings',
        activation_type: 'early_adopter'
      });
      
      // Meta Pixel
      window.fbq('track', 'CustomEvent', {
        event_name: 'User_Activated_2_Recordings',
        milestone: '2_recordings'
      });
      
      // Update database to prevent duplicate firing
      await updateSubscription(userId, { userActivated2: true });
    }
  }
  
  // Fire 5-recording milestone event (see section C below)
  if (recordingCount === 5) {
    // ... (5-recording logic)
  }
};
```

4. **Database Schema Requirement:**
   - Subscription table must have `userActivated2` field (Boolean, default: false)
   - This field prevents duplicate GA4 events if localStorage is cleared

**Event Parameters:**
- `user_id: [Cognito user ID]`
- `milestone: '2_recordings'`
- `activation_type: 'early_adopter'`

**Meta Pixel:** Also fires `CustomEvent` with name `User_Activated_2_Recordings`

**Why 2 Recordings:**
- Filters out single-use testers who never return
- Indicates user found value and came back
- Early signal of product-market fit
- Faster feedback loop than waiting for 5 recordings
- Helps identify successful onboarding

**Why Database Check:**
- Prevents duplicate events if user clears localStorage
- Ensures event fires exactly once per user
- More reliable than localStorage alone
- Syncs across devices/sessions

**Google Ads Value:** $15-25 (between sign_up and 5-recording milestone)

---

#### C. Power User Milestone (5 Recordings)

**Event Name:** `user_activated_5times` (SECONDARY CONVERSION)

**Location:** `src/utils/analytics.js` lines 74-91

**Trigger:** Automatically fires when user completes their 5th **FINAL** recording

**CRITICAL REQUIREMENT:** Must only fire on **completed recordings**, NOT on:
- Streaming chunks during note generation
- Partial recordings
- Intermediate text updates
- Any non-final recording state

**Implementation Plan:**

1. **isFinal Flag (REQUIRED):**
   - `trackRecordingCompleted(userId, isFinal)` must accept an `isFinal` boolean parameter
   - Only increment count and check milestone when `isFinal === true`
   - Prevents firing on stream chunks or partial updates

2. **Database Check (CRITICAL):**
   - Before firing the GA4 event, query the subscription table
   - Check if `userActivated` field equals `false`
   - **If `userActivated === true`:** Do NOT fire the GA4 event (already tracked)
   - **If `userActivated === false`:** Fire the GA4 event and update `userActivated` to `true`

3. **Dual Tracking (localStorage + Database):**
   - LocalStorage tracks count for UI/UX purposes
   - Database `userActivated` prevents duplicate GA4 events
   - Database is source of truth for event firing

**Implementation:**
```javascript
export const trackRecordingCompleted = async (userId, isFinal = false) => {
  // Only track completed recordings, not stream chunks
  if (!isFinal) {
    return; // Exit early if not a final recording
  }
  
  // Track individual completion
  ReactGA.event('recording_completed', { user_id: userId });
  
  // Increment count in localStorage
  let recordingCount = parseInt(localStorage.getItem('total_recordings') || '0');
  recordingCount++;
  localStorage.setItem('total_recordings', recordingCount);
  
  // Update user property
  ReactGA.set({ user_properties: { total_recordings: recordingCount } });
  
  // Fire milestone event at exactly 5 recordings
  if (recordingCount === 5) {
    // Check database to prevent duplicate firing
    const subscription = await fetchUserSubscription(userId);
    
    if (subscription.userActivated === false) {
      // Fire GA4 event
      ReactGA.event('user_activated_5times', {
        user_id: userId,
        milestone: '5_recordings',
        activation_type: 'power_user'
      });
      
      // Meta Pixel
      window.fbq('track', 'CustomEvent', {
        event_name: 'User_Activated_5_Recordings',
        milestone: '5_recordings'
      });
      
      // Update database to prevent duplicate firing
      await updateSubscription(userId, { userActivated: true });
    }
  }
};
```

4. **Database Schema Requirement:**
   - Subscription table must have `userActivated` field (Boolean, default: false)
   - This field prevents duplicate GA4 events if localStorage is cleared

5. **Calling Pattern:**
   ```javascript
   // WRONG - fires on every stream chunk
   handleTextStreamUpdate(newText) {
     await trackRecordingCompleted(userId); // ❌ NO!
   }
   
   // CORRECT - only fires when recording is complete
   handleRecordingComplete(finalText) {
     await trackRecordingCompleted(userId, isFinal: true); // ✅ YES!
   }
   ```

**Event Parameters:**
- `user_id: [Cognito user ID]`
- `milestone: '5_recordings'`
- `activation_type: 'power_user'`

**Meta Pixel:** Also fires `CustomEvent` with name `User_Activated_5_Recordings`

**Why 5 Recordings:**
- Filters out "tire-kickers" who test once and leave
- Indicates user has integrated product into workflow
- Strong predictor of retention (10x higher than 1 recording)
- Better optimization target for Google Ads than raw sign-ups

**Why Database Check:**
- Prevents duplicate events if user clears localStorage
- Ensures event fires exactly once per user
- More reliable than localStorage alone
- Syncs across devices/sessions

---

### Activation Strategy

**Primary Activation:** `sign_up`
- First conversion goal
- Optimize for volume in early campaigns
- Value: $5

**Early Activation:** `user_activated_2times`
- Early engagement signal
- Indicates user returned and found value
- Value: $15-25

**Power User Activation:** `user_activated_5times`
- Quality user conversion goal
- Optimize for engaged users after initial volume
- Value: $50-100

**Activation Funnel:**
1. User signs up → `sign_up` event
2. User completes 1st recording → `recording_completed` event
3. User completes 2nd recording → `user_activated_2times` event fires
4. User completes 3rd-4th recordings → `recording_completed` events (count increments)
5. User completes 5th recording → `user_activated_5times` event fires

---

### Google Ads Optimization

**Phase 1: Volume (First 30 Days)**
- Target: `sign_up` conversion
- Goal: 100+ sign-ups for data collection
- Bidding: Maximize conversions
- Value: $5

**Phase 2: Early Engagement (After 30 Days)**
- Target: `user_activated_2times` conversion
- Goal: Users who return and demonstrate early adoption
- Bidding: Maximize conversion value
- Value: $15-25
- Why: Faster feedback loop than 5 recordings, filters out one-time testers

**Phase 3: Power Users (After 60 Days)**
- Target: `user_activated_5times` conversion
- Goal: Users who integrate product into workflow
- Bidding: Maximize conversion value
- Value: $50-100
- Why: Strong retention predictor, optimize for quality users

**Phase 4: Revenue (After 90 Days)**
- Target: `purchase` conversion (from Make.com)
- Goal: Direct revenue optimization
- Bidding: Target ROAS
- Why: Direct monetization, optimize for paying customers

---

### GA4 Configuration Steps

#### 1. Mark as Key Events

**In GA4 UI:**
1. Go to **Admin** → **Events**
2. Find `sign_up` → Toggle **"Mark as key event"**
3. Wait 24-48 hours for `user_activated_2times` to appear
4. Find `user_activated_2times` → Toggle **"Mark as key event"**
5. Wait 24-48 hours for `user_activated_5times` to appear
6. Find `user_activated_5times` → Toggle **"Mark as key event"**

#### 2. Import to Google Ads

**In Google Ads:**
1. **Goals** → **Conversions** → **+ New conversion action**
2. Select **Import** → **Google Analytics 4**
3. Import `sign_up` key event
   - Value: $5
   - Count: One
4. Import `user_activated_2times` key event
   - Value: $20 (or $15-25 range)
   - Count: One
5. Import `user_activated_5times` key event
   - Value: $75 (or $50-100 range)
   - Count: One

#### 3. Create Audiences (Optional)

**Power Users:**
- Include: Users who triggered `user_activated_5times`
- Use: Upsell campaigns, lookalike audiences, testimonial requests

**Early Adopters:**
- Include: Users who triggered `user_activated_2times`
- Exclude: Users who triggered `user_activated_5times`
- Use: Nurture campaigns, feature education, upgrade prompts

**At-Risk Early Adopters:**
- Include: Users who triggered `user_activated_2times`
- Exclude: Activity in last 14 days
- Use: Re-engagement campaigns, "We miss you" emails

**Single-Use Testers:**
- Include: `sign_up` 7+ days ago
- Include: Exactly 1 `recording_completed` event
- Exclude: Activity in last 7 days
- Use: Onboarding improvement, "Need help?" campaigns

**Tire-Kickers:**
- Include: `sign_up` 14+ days ago
- Exclude: Any `recording_completed` events
- Use: Win-back campaigns (low priority), survey for feedback

---

### Testing & Verification

#### Browser Console Testing

1. Open DevTools → Console
2. Complete a recording
3. Look for: `[GA4] Recording completed. Total: 1`
4. Complete 2nd recording
5. Look for: `[GA4] 🎉 Early adopter! 2 recordings milestone reached`
6. Complete 3rd-4th recordings
7. On 5th recording, look for: `[GA4] 🎉 Power user! 5 recordings milestone reached`

#### GA4 DebugView

1. GA4 → **Admin** → **DebugView**
2. Complete recordings
3. Verify `recording_completed` events appear after each recording
4. On 2nd recording, verify `user_activated_2times` event appears
5. On 5th recording, verify `user_activated_5times` event appears

#### Event Parameters to Verify

**`recording_completed`:**
- `user_id` present
- Fires after each completed recording (isFinal = true)
- Does NOT fire on stream chunks

**`user_activated_2times`:**
- `user_id` present
- `milestone: '2_recordings'`
- `activation_type: 'early_adopter'`
- Fires only once (at 2nd recording)
- Database check: `userActivated2 === false` before firing

**`user_activated_5times`:**
- `user_id` present
- `milestone: '5_recordings'`
- `activation_type: 'power_user'`
- Fires only once (at 5th recording)
- Database check: `userActivated === false` before firing

---

## Summary of Tracking Points

### Currently Implemented (Active)
1. **Landing Page:** 6 button click events (Sign In, Book Demo, Try Free CTAs)
2. **Landing Page:** Page view and ViewContent Meta events
3. **Account Page:** Page view tracking
4. **Account Page:** 2 button click events (Browse Plans, Manage Billing)
5. **App.jsx:** Account creation tracking (`sign_up` event - PRIMARY CONVERSION)
6. **App.jsx:** User properties tracking (user_id, email, total_recordings)
7. **PriceTable:** Begin checkout tracking
8. **App.jsx:** Recording completion tracking (`recording_completed` event) ✅ **NEW**
9. **App.jsx:** 2-recording activation milestone (`user_activated_2times` - EARLY ENGAGEMENT) ✅ **NEW**
10. **App.jsx:** 5-recording activation milestone (`user_activated_5times` - POWER USER) ✅ **NEW**

### Planned (Commented in Code)
1. **Landing Page:** Video engagement (play, pause, complete)
2. **Landing Page:** Section navigation tracking
3. **Landing Page:** FAQ expansion tracking

### Make.com Integration (External)
1. **Stripe → Google Ads:** Purchase conversion tracking via webhook

### Total Tracking Points
- **Active:** 15 events (12 previous + 3 new product usage events)
- **Planned:** 3 events
- **External:** 1 Make.com integration
- **Total:** 19 tracking points

---

### Key Files Modified

1. **`src/utils/analytics.js`** - Added conversion tracking functions (lines 50-161) + recording completion tracking (lines 50-93)
2. **`src/App.jsx`** - Added auth listener and user properties (lines 381-425) + recording completion tracking (lines 287-306)
3. **`src/components/Account/PriceTable.jsx`** - Added begin_checkout tracking (lines 27-29)

---

## Quick Reference: Missing Configuration Items

To complete your tracking setup, you need to add these IDs to the table above:

1. **GA4 Property ID**: Found in GA4 Admin → Property Settings (numeric ID)
2. **GA4 Stream ID**: Found in GA4 Admin → Data Streams → [Your Web Stream] → Stream details (numeric ID)

Once you have these IDs, update the table in the "GA4 Configuration Reference" section at the top of this document.

---

*Last Updated: October 18, 2025*