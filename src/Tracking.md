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
- ✅ `viewedCart` - Pricing table views (CONVERSION FUNNEL TRACKING)
- ✅ `purchasedStandard` - Standard plan purchase (CONVERSION)
- ✅ `purchasedProfessional` - Professional plan purchase (CONVERSION)

**Standard Events (Consent Required):**
- `recording_completed` - Individual recording tracking
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

**STEP 1: GraphQL Schema Update**

Add the `isActivated` field to the Subscription table in your GraphQL schema:

```graphql
# File: amplify/backend/api/chironotev4/schema.graphql
type Subscription @model @auth(rules: [{allow: owner}]) {
  id: ID!
  owner: String
  plan: String
  status: String
  # ... existing fields ...
  isActivated: Boolean  # NEW: Controls tutorial visibility and sign_up event
  has3Notes: Boolean    # NEW: Tracks 3-note milestone completion
  has5Notes: Boolean    # NEW: Tracks 5-note milestone completion
}
```

**STEP 2: Tutorial Integration**

The tutorial component (IntroTour.jsx) must:

1. **Read `isActivated` from subscription table** on component mount
2. **Only show tutorial if `isActivated === false`**
3. **Fire `sign_up` GA4 event** on tutorial's first load (before it displays)
4. **Update `isActivated` to `true`** when tutorial is completed or skipped

```javascript
// File: src/components/IntroTour/IntroTour.jsx
// Implementation pseudocode - WAITING FOR BACKEND DEPLOYMENT

useEffect(() => {
  const initializeTutorial = async () => {
    // Fetch user's subscription record
    const userAttributes = await fetchUserAttributes();
    const userId = userAttributes.sub;
    const email = userAttributes.email;
    const subscription = await fetchUserSubscription(userId);
    
    // Check if user has already been activated
    if (subscription.isActivated === true) {
      // User already completed tutorial - do not show again
      return;
    }
    
    // User is new - fire sign_up event ONCE
    if (subscription.isActivated === false) {
      await trackSignUp(email, userId);
      console.log('[GA4] Sign-up conversion tracked on first tutorial load');
    }
    
    // Show tutorial
    startTutorial();
  };
  
  initializeTutorial();
}, []);

// When tutorial completes or is skipped
const handleTutorialComplete = async () => {
  const userAttributes = await fetchUserAttributes();
  const userId = userAttributes.sub;
  
  // Update database to mark user as activated
  await updateSubscription(userId, { isActivated: true });
  
  // Close tutorial
  closeTutorial();
};
```

**STEP 3: Prevent Duplicate Events**

The `isActivated` field serves as the source of truth:
- **`isActivated === false`:** User is new, show tutorial, fire `sign_up` event
- **`isActivated === true`:** User already completed onboarding, skip tutorial
- **Benefits:** Works across all devices and survives localStorage clears

**STEP 4: Tutorial Flow**

1. User creates account via Amplify authentication
2. User redirects to authenticated app
3. App loads IntroTour component
4. IntroTour queries `isActivated` from subscription table
5. If `false`, fire `sign_up` GA4 event and show tutorial
6. When tutorial finishes/skips, update `isActivated` to `true`
7. Future sessions check `isActivated === true` and skip tutorial

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

#### B. Viewed Cart (Pricing Table View)

**Event Name:** `viewedCart` (custom GA4 event)

**Location:** `src/components/Account/PriceTable.jsx` lines 27-28

**Trigger:** When user views Stripe pricing table on `/app/pricingplans`

**Implementation:**
```javascript
useEffect(() => {
  const getUserEmail = async () => {
    const userAttributes = await fetchUserAttributes();
    const email = userAttributes.email;
    const userId = userAttributes.sub;
    
    // Track viewedCart conversion (no consent required)
    await trackViewedCart(email, userId);
  };
  getUserEmail();
}, []);
```

**Event Parameters:**
- `user_email: [user email address]`
- `user_id: [Cognito user ID]`
- `content_type: 'pricing_table'`

**Meta Pixel:** Also fires `ViewContent` event with pricing metadata

**Purpose:** Track checkout funnel and optimize for users who view pricing but don't purchase. This is a KEY CONVERSION EVENT that always tracks regardless of cookie consent.

**Why No Consent Required:** Viewing the pricing table is a critical conversion funnel indicator for Google Ads optimization. This event helps identify users in the consideration phase.

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

#### B. Early Activation Milestone (3 Notes)

**Event Name:** `user_activated_3notes` (EARLY ENGAGEMENT CONVERSION)

**Location:** Existing note-saving logic in `src/App.jsx` (where notes are persisted to database)

**Trigger:** Automatically fires when user saves their 3rd **FINAL** note to the database

**Purpose:** Track users who move beyond initial trial and demonstrate early product adoption. This is a leading indicator for future retention and helps optimize for users who are likely to become power users.

**CRITICAL REQUIREMENT:** Must only fire when a **completed note is saved to the database**, NOT on:
- Streaming chunks during note generation
- Partial recordings
- Draft notes not yet saved
- Any non-final note state

**Implementation Plan:**

**STEP 1: Use Existing Note-Counting Logic**

The app already has logic that counts notes when saving/updating. Integrate the milestone check into this existing workflow:

```javascript
// File: src/App.jsx (in the note-saving function)
// Pseudocode - WAITING FOR BACKEND DEPLOYMENT

// After successfully saving note to database
const handleNoteSaved = async (savedNote) => {
  // ... existing note save logic ...
  
  // Count total notes for this user (from database, not localStorage)
  const userNotes = await fetchUserNotes(userId);
  const noteCount = userNotes.length;
  
  // Check 3-note milestone
  if (noteCount === 3) {
    const subscription = await fetchUserSubscription(userId);
    
    // Only fire if has3Notes is false (prevents duplicate firing)
    if (subscription.has3Notes === false) {
      // Fire GA4 event
      await trackMilestone('user_activated_3notes', userId, {
        milestone: '3_notes',
        activation_type: 'early_adopter'
      });
      
      // Update database to prevent duplicate firing
      await updateSubscription(userId, { has3Notes: true });
      
      console.log('[GA4] 🎉 Early adopter! 3 notes milestone reached');
    }
  }
};
```

**STEP 2: Database Check (CRITICAL)**

- Before firing the GA4 event, query the subscription table
- Check if `has3Notes` field equals `false`
- **If `has3Notes === true`:** Do NOT fire the GA4 event (already tracked)
- **If `has3Notes === false`:** Fire the GA4 event and update `has3Notes` to `true`

**STEP 3: Count from Database, Not localStorage**

- Use the actual count of notes in the database (via GraphQL query)
- This ensures accuracy across devices and survives app uninstalls
- Database is the single source of truth

**STEP 4: GraphQL Schema Requirement**

- Subscription table must have `has3Notes` field (Boolean, default: false)
- This field prevents duplicate GA4 events
- Already defined in schema (see Section A, Step 1)

**Event Parameters:**
- `user_id: [Cognito user ID]`
- `milestone: '3_notes'`
- `activation_type: 'early_adopter'`

**Meta Pixel:** Also fires `CustomEvent` with name `User_Activated_3_Notes`

**Why 3 Notes:**
- Filters out single-use testers who never return
- Indicates user found value and came back multiple times
- Early signal of product-market fit
- Faster feedback loop than waiting for 5 notes
- Helps identify successful onboarding

**Why Database Check:**
- Prevents duplicate events across devices
- Ensures event fires exactly once per user
- More reliable than localStorage
- Syncs across all sessions

**Google Ads Value:** $15-25 (between sign_up and 5-note milestone)

---

#### C. Power User Milestone (5 Notes)

**Event Name:** `user_activated_5notes` (SECONDARY CONVERSION)

**Location:** Existing note-saving logic in `src/App.jsx` (where notes are persisted to database)

**Trigger:** Automatically fires when user saves their 5th **FINAL** note to the database

**Purpose:** Track users who have fully integrated the product into their workflow and demonstrate consistent usage patterns.

**CRITICAL REQUIREMENT:** Must only fire when a **completed note is saved to the database**, NOT on:
- Streaming chunks during note generation
- Partial recordings
- Draft notes not yet saved
- Any non-final note state

**Implementation Plan:**

**STEP 1: Use Existing Note-Counting Logic**

The app already has logic that counts notes when saving/updating. Integrate the milestone check into this existing workflow:

```javascript
// File: src/App.jsx (in the note-saving function)
// Pseudocode - WAITING FOR BACKEND DEPLOYMENT

// After successfully saving note to database
const handleNoteSaved = async (savedNote) => {
  // ... existing note save logic ...
  
  // Count total notes for this user (from database, not localStorage)
  const userNotes = await fetchUserNotes(userId);
  const noteCount = userNotes.length;
  
  // Check 3-note milestone
  if (noteCount === 3) {
    const subscription = await fetchUserSubscription(userId);
    if (subscription.has3Notes === false) {
      await trackMilestone('user_activated_3notes', userId, {
        milestone: '3_notes',
        activation_type: 'early_adopter'
      });
      await updateSubscription(userId, { has3Notes: true });
      console.log('[GA4] 🎉 Early adopter! 3 notes milestone reached');
    }
  }
  
  // Check 5-note milestone
  if (noteCount === 5) {
    const subscription = await fetchUserSubscription(userId);
    
    // Only fire if has5Notes is false (prevents duplicate firing)
    if (subscription.has5Notes === false) {
      // Fire GA4 event (NO CONSENT REQUIRED)
      await trackMilestone('user_activated_5notes', userId, {
        milestone: '5_notes',
        activation_type: 'power_user'
      });
      
      // Update database to prevent duplicate firing
      await updateSubscription(userId, { has5Notes: true });
      
      console.log('[GA4] 🎉 Power user! 5 notes milestone reached');
    }
  }
};
```

**STEP 2: Database Check (CRITICAL)**

- Before firing the GA4 event, query the subscription table
- Check if `has5Notes` field equals `false`
- **If `has5Notes === true`:** Do NOT fire the GA4 event (already tracked)
- **If `has5Notes === false`:** Fire the GA4 event and update `has5Notes` to `true`

**STEP 3: Count from Database, Not localStorage**

- Use the actual count of notes in the database (via GraphQL query)
- This ensures accuracy across devices and survives app uninstalls
- Database is the single source of truth

**STEP 4: GraphQL Schema Requirement**

- Subscription table must have `has5Notes` field (Boolean, default: false)
- This field prevents duplicate GA4 events
- Already defined in schema (see Section A, Step 1)

**STEP 5: No Consent Required**

- This is a **critical conversion event** that fires regardless of cookie consent
- Required for Google Ads optimization (per existing implementation in analytics.js)
- Already implemented in `trackMilestone()` function

**Event Parameters:**
- `user_id: [Cognito user ID]`
- `milestone: '5_notes'`
- `activation_type: 'power_user'`

**Meta Pixel:** Also fires `CustomEvent` with name `User_Activated_5_Notes`

**Why 5 Notes:**
- Filters out "tire-kickers" who test once and leave
- Indicates user has integrated product into workflow
- Strong predictor of retention (10x higher than 1 note)
- Better optimization target for Google Ads than raw sign-ups

**Why Database Check:**
- Prevents duplicate events across devices
- Ensures event fires exactly once per user
- More reliable than localStorage
- Syncs across all sessions

---

### Activation Strategy

**Primary Activation:** `sign_up`
- First conversion goal
- Optimize for volume in early campaigns
- Value: $5
- Fires: On tutorial first load (via `isActivated` field)

**Early Activation:** `user_activated_3notes`
- Early engagement signal
- Indicates user returned and found value multiple times
- Value: $15-25
- Fires: When 3rd note is saved (via `has3Notes` field)

**Power User Activation:** `user_activated_5notes`
- Quality user conversion goal
- Optimize for engaged users after initial volume
- Value: $50-100
- Fires: When 5th note is saved (via `has5Notes` field)

**Activation Funnel:**
1. User creates account → Tutorial loads → `sign_up` event (isActivated = false → true)
2. User completes 1st note → `recording_completed` event (individual tracking)
3. User completes 2nd note → `recording_completed` event (individual tracking)
4. User completes 3rd note → `user_activated_3notes` event fires (has3Notes = false → true)
5. User completes 4th note → `recording_completed` event (individual tracking)
6. User completes 5th note → `user_activated_5notes` event fires (has5Notes = false → true)

---

### Google Ads Optimization

**Phase 1: Volume (First 30 Days)**
- Target: `sign_up` conversion
- Goal: 100+ sign-ups for data collection
- Bidding: Maximize conversions
- Value: $5

**Phase 2: Early Engagement (After 30 Days)**
- Target: `user_activated_3notes` conversion
- Goal: Users who return and demonstrate early adoption
- Bidding: Maximize conversion value
- Value: $15-25
- Why: Faster feedback loop than 5 notes, filters out one-time testers

**Phase 3: Power Users (After 60 Days)**
- Target: `user_activated_5notes` conversion
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
3. Wait 24-48 hours for `user_activated_3notes` to appear
4. Find `user_activated_3notes` → Toggle **"Mark as key event"**
5. Wait 24-48 hours for `user_activated_5notes` to appear
6. Find `user_activated_5notes` → Toggle **"Mark as key event"**

#### 2. Import to Google Ads

**In Google Ads:**
1. **Goals** → **Conversions** → **+ New conversion action**
2. Select **Import** → **Google Analytics 4**
3. Import `sign_up` key event
   - Value: $5
   - Count: One
4. Import `user_activated_3notes` key event
   - Value: $20 (or $15-25 range)
   - Count: One
5. Import `user_activated_5notes` key event
   - Value: $75 (or $50-100 range)
   - Count: One

#### 3. Create Audiences (Optional)

**Power Users:**
- Include: Users who triggered `user_activated_5notes`
- Use: Upsell campaigns, lookalike audiences, testimonial requests

**Early Adopters:**
- Include: Users who triggered `user_activated_3notes`
- Exclude: Users who triggered `user_activated_5notes`
- Use: Nurture campaigns, feature education, upgrade prompts

**At-Risk Early Adopters:**
- Include: Users who triggered `user_activated_3notes`
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
2. Create new account → Look for: `[GA4] Sign-up conversion tracked on first tutorial load`
3. Complete tutorial → Verify `isActivated` updated to `true`
4. Complete 1st note → Look for: `[GA4] Recording completed. Total: 1`
5. Complete 2nd note → Look for: `[GA4] Recording completed. Total: 2`
6. Complete 3rd note → Look for: `[GA4] 🎉 Early adopter! 3 notes milestone reached`
7. Complete 4th note → Look for: `[GA4] Recording completed. Total: 4`
8. Complete 5th note → Look for: `[GA4] 🎉 Power user! 5 notes milestone reached`

#### GA4 DebugView

1. GA4 → **Admin** → **DebugView**
2. Create new account and complete tutorial
3. Verify `sign_up` event appears with email parameter
4. Complete notes
5. Verify `recording_completed` events appear after each note
6. On 3rd note, verify `user_activated_3notes` event appears
7. On 5th note, verify `user_activated_5notes` event appears

#### Event Parameters to Verify

**`sign_up`:**
- `user_id` present
- `user_email` present
- `method: 'email'`
- Fires only once (on tutorial first load)
- Database check: `isActivated === false` before firing

**`recording_completed`:**
- `user_id` present
- Fires after each completed note saved to database
- Does NOT fire on stream chunks

**`user_activated_3notes`:**
- `user_id` present
- `milestone: '3_notes'`
- `activation_type: 'early_adopter'`
- Fires only once (at 3rd note)
- Database check: `has3Notes === false` before firing

**`user_activated_5notes`:**
- `user_id` present
- `milestone: '5_notes'`
- `activation_type: 'power_user'`
- Fires only once (at 5th note)
- Database check: `has5Notes === false` before firing

---

## Summary of Tracking Points

### Currently Implemented (Active)
1. **Landing Page:** 6 button click events (Sign In, Book Demo, Try Free CTAs)
2. **Landing Page:** Page view and ViewContent Meta events
3. **Account Page:** Page view tracking
4. **Account Page:** 2 button click events (Browse Plans, Manage Billing)
5. **App.jsx:** User properties tracking (user_id, email, total_recordings)
6. **PriceTable:** Begin checkout tracking
7. **App.jsx:** Recording completion tracking (`recording_completed` event)

### Waiting for Backend Deployment
These features are fully designed and documented but require GraphQL schema updates:

1. **IntroTour:** Sign-up conversion tracking (`sign_up` event - PRIMARY CONVERSION) 🔴 **WAITING**
   - Requires: `isActivated` field in Subscription table
   - Fires: On tutorial first load when `isActivated === false`
   
2. **App.jsx:** 3-note activation milestone (`user_activated_3notes` - EARLY ENGAGEMENT) 🔴 **WAITING**
   - Requires: `has3Notes` field in Subscription table
   - Fires: When 3rd note is saved and `has3Notes === false`
   
3. **App.jsx:** 5-note activation milestone (`user_activated_5notes` - POWER USER) 🔴 **WAITING**
   - Requires: `has5Notes` field in Subscription table
   - Fires: When 5th note is saved and `has5Notes === false`

### Planned (Commented in Code)
1. **Landing Page:** Video engagement (play, pause, complete)
2. **Landing Page:** Section navigation tracking
3. **Landing Page:** FAQ expansion tracking

### Make.com Integration (External)
1. **Stripe → Google Ads:** Purchase conversion tracking via webhook

### Total Tracking Points
- **Active:** 10 events
- **Waiting for Backend:** 3 critical conversion events
- **Planned:** 3 engagement events
- **External:** 1 Make.com integration
- **Total:** 17 tracking points

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

## 🚀 DEPLOYMENT INSTRUCTIONS: GraphQL Schema Updates

This section provides step-by-step instructions for deploying the new tracking fields to your AWS Amplify backend.

### Prerequisites

Before starting, ensure you have:
- ✅ AWS Amplify CLI installed (`npm install -g @aws-amplify/cli`)
- ✅ AWS credentials configured (`amplify configure`)
- ✅ Amplify project initialized in your workspace
- ✅ Access to AWS console with appropriate permissions
- ✅ All code changes committed to version control (recommended)

---

### STEP 1: Update GraphQL Schema

**File:** `amplify/backend/api/chironotev4/schema.graphql`

Locate the `Subscription` type definition and add the three new Boolean fields:

```graphql
type Subscription @model @auth(rules: [{allow: owner}]) {
  id: ID!
  owner: String
  plan: String
  status: String
  # ... your existing fields (stripeCustomerId, subscriptionId, etc.) ...
  
  # NEW FIELDS FOR CONVERSION TRACKING
  isActivated: Boolean     # Controls tutorial visibility and sign_up event
  has3Notes: Boolean       # Tracks 3-note milestone completion  
  has5Notes: Boolean       # Tracks 5-note milestone completion
}
```

**⚠️ IMPORTANT:**
- Add these fields to your existing `Subscription` type
- Do NOT create a new type
- Keep all existing fields unchanged
- Default value for Boolean fields is `null` (will be handled in code)

---

### STEP 2: Review Schema Changes

Before pushing to the backend, verify:

1. **Backup existing schema:**
   ```bash
   cp amplify/backend/api/chironotev4/schema.graphql amplify/backend/api/chironotev4/schema.graphql.backup
   ```

2. **Validate syntax:**
   - Open the schema file and check for typos
   - Ensure proper indentation
   - Verify all existing fields are still present

3. **Check related files:**
   - Confirm no other schema files need updates
   - Review any custom resolvers (if applicable)

---

### STEP 3: Push Schema to Backend

Deploy the updated schema to AWS:

```bash
# Navigate to project root
cd c:\ChiroNote\Code\chironote

# Push schema changes to AWS
amplify push
```

**You will be prompted with:**
```
? Are you sure you want to continue? (Y/n)
```
**Type:** `Y` and press Enter

**Next prompt:**
```
? Do you want to generate code for your newly created GraphQL API? (Y/n)
```
**Type:** `Y` and press Enter

**Next prompt:**
```
? Choose the code generation language target: (Use arrow keys)
  javascript
  typescript
  flow
```
**Select:** `javascript` (press Enter)

**Next prompt:**
```
? Enter the file name pattern of graphql queries, mutations and subscriptions:
```
**Type:** `src/graphql/**/*.js` (press Enter)

**Next prompt:**
```
? Do you want to generate/update all possible GraphQL operations? (Y/n)
```
**Type:** `Y` and press Enter

**Deployment process will start:**
- ⏳ CloudFormation stack creation/update (5-15 minutes)
- ⏳ DynamoDB table migration
- ⏳ AppSync API update
- ⏳ Code generation

---

### STEP 4: Verify Backend Deployment

After deployment completes, verify the changes:

1. **Check AWS Console:**
   - Open AWS AppSync Console
   - Navigate to your API
   - Go to **Schema** tab
   - Verify `isActivated`, `has3Notes`, `has5Notes` fields exist in Subscription type

2. **Check DynamoDB:**
   - Open DynamoDB Console
   - Find your Subscription table (e.g., `Subscription-xxxxx-dev`)
   - The table now supports the new fields (they'll appear when data is written)

3. **Test in AppSync Queries:**
   ```graphql
   query GetUserSubscription {
     getSubscription(id: "your-subscription-id") {
       id
       owner
       plan
       isActivated
       has3Notes
       has5Notes
     }
   }
   ```

---

### STEP 5: Verify Generated GraphQL Files

Check that the new fields appear in your local GraphQL operations:

1. **File:** `src/graphql/queries.js`
   - Open the file
   - Find `getSubscription` and `listSubscriptions`
   - Verify `isActivated`, `has3Notes`, `has5Notes` are included

2. **File:** `src/graphql/mutations.js`
   - Open the file
   - Find `createSubscription` and `updateSubscription`
   - Verify new fields are included

3. **File:** `src/graphql/subscriptions.js`
   - Open the file
   - Verify new fields are included in subscription operations

**Example (queries.js):**
```javascript
export const getSubscription = /* GraphQL */ `
  query GetSubscription($id: ID!) {
    getSubscription(id: $id) {
      id
      owner
      plan
      status
      isActivated
      has3Notes
      has5Notes
      createdAt
      updatedAt
    }
  }
`;
```

---

### STEP 6: Update Frontend Components

Now implement the tracking logic in your frontend components:

#### A. IntroTour Component (Tutorial + sign_up event)

**File:** `src/components/IntroTour/IntroTour.jsx`

Add the tutorial initialization logic:

```javascript
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { getSubscription, updateSubscription } from '../../graphql/mutations';
import { trackSignUp } from '../../utils/analytics';

const client = generateClient();

useEffect(() => {
  const initializeTutorial = async () => {
    try {
      // Get user attributes
      const userAttributes = await fetchUserAttributes();
      const userId = userAttributes.sub;
      const email = userAttributes.email;
      
      // Fetch subscription record
      const subscriptionData = await client.graphql({
        query: getSubscription,
        variables: { id: userId }
      });
      
      const subscription = subscriptionData.data.getSubscription;
      
      // Check if user is already activated
      if (subscription?.isActivated === true) {
        console.log('[Tutorial] User already activated, skipping tutorial');
        return; // Don't show tutorial
      }
      
      // Fire sign_up GA4 event (first time only)
      if (subscription?.isActivated !== true) {
        await trackSignUp(email, userId);
        console.log('[GA4] Sign-up conversion tracked on first tutorial load');
      }
      
      // Show tutorial
      startTutorial();
      
    } catch (error) {
      console.error('[Tutorial] Initialization error:', error);
    }
  };
  
  initializeTutorial();
}, []);

// When tutorial completes or is skipped
const handleTutorialComplete = async () => {
  try {
    const userAttributes = await fetchUserAttributes();
    const userId = userAttributes.sub;
    
    // Update isActivated to prevent future tutorial displays
    await client.graphql({
      query: updateSubscription,
      variables: {
        input: {
          id: userId,
          isActivated: true
        }
      }
    });
    
    console.log('[Tutorial] User activated, tutorial will not show again');
    closeTutorial();
    
  } catch (error) {
    console.error('[Tutorial] Activation update error:', error);
    closeTutorial(); // Still close tutorial even if update fails
  }
};
```

#### B. App.jsx (Note Milestone Tracking)

**File:** `src/App.jsx`

Add milestone checking to your note-saving function:

```javascript
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { listNotes } from './graphql/queries';
import { updateSubscription } from './graphql/mutations';
import ReactGA from 'react-ga4';

const client = generateClient();

// Add this helper function
const trackNoteMilestone = async (userId) => {
  try {
    // Get user's subscription
    const subscriptionData = await client.graphql({
      query: getSubscription,
      variables: { id: userId }
    });
    const subscription = subscriptionData.data.getSubscription;
    
    // Get user's total notes count from database
    const notesData = await client.graphql({
      query: listNotes,
      variables: {
        filter: { owner: { eq: userId } }
      }
    });
    const noteCount = notesData.data.listNotes.items.length;
    
    console.log(`[Tracking] User has ${noteCount} total notes`);
    
    // Check 3-note milestone
    if (noteCount === 3 && subscription?.has3Notes !== true) {
      // Fire GA4 event
      ReactGA.event('user_activated_3notes', {
        user_id: userId,
        milestone: '3_notes',
        activation_type: 'early_adopter'
      });
      
      // Meta Pixel
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'CustomEvent', {
          event_name: 'User_Activated_3_Notes',
          milestone: '3_notes'
        });
      }
      
      // Update database
      await client.graphql({
        query: updateSubscription,
        variables: {
          input: {
            id: userId,
            has3Notes: true
          }
        }
      });
      
      console.log('[GA4] 🎉 Early adopter! 3 notes milestone reached');
    }
    
    // Check 5-note milestone
    if (noteCount === 5 && subscription?.has5Notes !== true) {
      // Fire GA4 event (NO CONSENT REQUIRED)
      ReactGA.event('user_activated_5notes', {
        user_id: userId,
        milestone: '5_notes',
        activation_type: 'power_user'
      });
      
      // Meta Pixel
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'CustomEvent', {
          event_name: 'User_Activated_5_Notes',
          milestone: '5_notes'
        });
      }
      
      // Update database
      await client.graphql({
        query: updateSubscription,
        variables: {
          input: {
            id: userId,
            has5Notes: true
          }
        }
      });
      
      console.log('[GA4] 🎉 Power user! 5 notes milestone reached');
    }
    
  } catch (error) {
    console.error('[Tracking] Milestone check error:', error);
  }
};

// Call this function after successfully saving a note
const handleNoteSaved = async (savedNote) => {
  // ... your existing note save logic ...
  
  // Check milestones after save
  const userAttributes = await fetchUserAttributes();
  const userId = userAttributes.sub;
  await trackNoteMilestone(userId);
};
```

---

### STEP 7: Test the Implementation

Complete end-to-end testing:

#### Test Sign-Up Tracking:
1. Create a new test account
2. Open browser console (F12)
3. Look for: `[GA4] Sign-up conversion tracked on first tutorial load`
4. Complete or skip tutorial
5. Refresh page
6. Verify tutorial does NOT show again
7. Check DynamoDB: `isActivated` should be `true`

#### Test 3-Note Milestone:
1. Using test account, create 1st note
2. Create 2nd note
3. Create 3rd note → Look for: `[GA4] 🎉 Early adopter! 3 notes milestone reached`
4. Check DynamoDB: `has3Notes` should be `true`
5. Create more notes → Verify milestone does NOT fire again

#### Test 5-Note Milestone:
1. Continue with same test account
2. Create 4th note
3. Create 5th note → Look for: `[GA4] 🎉 Power user! 5 notes milestone reached`
4. Check DynamoDB: `has5Notes` should be `true`
5. Create more notes → Verify milestone does NOT fire again

#### Verify GA4 Events:
1. Open GA4 → Configure → DebugView
2. Filter by your test user
3. Verify these events appear:
   - `sign_up` (with email parameter)
   - `user_activated_3notes` (on 3rd note)
   - `user_activated_5notes` (on 5th note)

---

### STEP 8: Monitor Production Deployment

After deploying to production:

1. **Monitor CloudWatch Logs:**
   - Check for GraphQL errors
   - Watch for unexpected null values
   - Monitor API response times

2. **Track Initial Users:**
   - Watch first 10-20 sign-ups
   - Verify events fire correctly
   - Check DynamoDB for field updates

3. **GA4 Monitoring:**
   - Go to GA4 → Reports → Realtime
   - Watch for `sign_up` events
   - Monitor `user_activated_3notes` after a few days
   - Monitor `user_activated_5notes` after 1-2 weeks

4. **Error Handling:**
   - Set up alerts for GraphQL errors
   - Monitor console errors in production
   - Have rollback plan ready if needed

---

### Troubleshooting

#### Issue: Fields not appearing in GraphQL operations

**Solution:**
```bash
amplify codegen
```
This regenerates the GraphQL files.

#### Issue: CloudFormation stack update fails

**Solution:**
1. Check AWS Console → CloudFormation
2. View stack events for error details
3. Common causes:
   - Insufficient permissions
   - Conflicting resource names
   - Schema syntax errors

#### Issue: DynamoDB fields not updating

**Solution:**
1. Verify subscription ID matches user ID
2. Check user has proper authentication
3. Verify IAM permissions for owner-based access
4. Test with AppSync console directly

#### Issue: Tutorial shows every time despite isActivated = true

**Solution:**
1. Check subscription query returns data
2. Verify userId matches subscription id
3. Add defensive checks for null/undefined
4. Clear browser localStorage as test

---

### Rollback Plan

If deployment causes issues:

1. **Revert Schema:**
   ```bash
   # Restore backup
   cp amplify/backend/api/chironotev4/schema.graphql.backup amplify/backend/api/chironotev4/schema.graphql
   
   # Push reverted schema
   amplify push
   ```

2. **Revert Code:**
   ```bash
   git revert [commit-hash]
   git push origin main
   ```

3. **Keep Backend, Remove Frontend:**
   - Comment out milestone tracking code
   - Keep backend fields (they won't cause issues)
   - Re-enable when ready

---

### Post-Deployment Checklist

- [ ] Schema deployed successfully to AWS
- [ ] New fields visible in AppSync console
- [ ] GraphQL operations regenerated with new fields
- [ ] IntroTour component updated with tutorial logic
- [ ] App.jsx updated with milestone tracking
- [ ] Test account created and verified
- [ ] `sign_up` event fires on first tutorial
- [ ] Tutorial doesn't show after completion
- [ ] `user_activated_3notes` fires on 3rd note
- [ ] `user_activated_5notes` fires on 5th note
- [ ] Events visible in GA4 DebugView
- [ ] DynamoDB fields updating correctly
- [ ] No console errors in production
- [ ] CloudWatch logs clean
- [ ] Documentation updated
- [ ] Team notified of changes

---

### Success Criteria

Your deployment is successful when:

✅ **Backend:**
- New fields exist in AppSync schema
- DynamoDB table supports new fields
- No CloudFormation errors

✅ **Frontend:**
- Tutorial shows once for new users
- `sign_up` event fires on first tutorial load
- Tutorial never shows after completion
- Milestone events fire at exactly 3rd and 5th notes
- Events never fire more than once per user

✅ **Analytics:**
- Events appear in GA4 DebugView
- Event parameters are correct
- No duplicate events
- Events attributed to correct users

✅ **Production:**
- No error logs
- Normal app performance
- Users report no issues
- Conversion tracking working in Google Ads

---

## Changelog

### October 24, 2025
**Schema Update:**
- Added `hoursSavedLifetime` field to UserSubscription type for cumulative hours saved tracking

**Tracking Update:**
- Replaced `begin_checkout` event with `viewedCart` event for pricing table views
- `viewedCart` is now a KEY CONVERSION EVENT (no consent required)
- Updated `src/components/Account/PriceTable.jsx` to use `trackViewedCart()` function
- Added `trackViewedCart()` function to `src/utils/analytics.js` (lines 299-317)
- Event includes email, userId, and content_type parameters
- Meta Pixel integration: Fires `ViewContent` event with pricing metadata
- Purpose: Critical conversion funnel tracking for Google Ads optimization

---

*Last Updated: October 24, 2025*