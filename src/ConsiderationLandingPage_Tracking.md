# ConsiderationLandingPage Video Tracking Documentation

**File Location:** `src/components/LandingPage/ConsiderationLandingPage.jsx`

**Purpose:** Consideration-stage landing page focused on demonstrating ChiroNote's value through video content and detailed feature explanations.

---

## Video Engagement Tracking (IMPLEMENTED)

### Overview

The ConsiderationLandingPage now tracks when users watch 75% of the demo video. This is a strong conversion indicator for retargeting campaigns and funnel optimization.

### Tracked Event

**Event Name:** `Video_75%_Watched`

**Event Structure:**
- **Category:** `'VideoEngagement'`
- **Action:** `'Video_75%_Watched'`
- **Label:** `'Consideration_Landing_Demo_Video'`
- **Consent Check:** ⚠️ **NO CONSENT REQUIRED** - This is a critical conversion event that always tracks

### Implementation Details

**Location in Code:**
- **Handler Function:** Lines 193-205 in `ConsiderationLandingPage.jsx`
- **Video Element:** Line 359 in `ConsiderationLandingPage.jsx`
- **Tracking Function:** Lines 50-53 in `src/utils/analytics.js`

**Implementation Code:**

```javascript
// State to prevent duplicate tracking
const [video75Tracked, setVideo75Tracked] = useState(false);

// Handler function
const handleVideoTimeUpdate = () => {
  if (videoRef.current && !video75Tracked) {
    const video = videoRef.current;
    const progress = (video.currentTime / video.duration) * 100;
    
    // Track when user reaches 75% of video
    if (progress >= 75) {
      trackVideoProgress('Consideration_Landing_Demo_Video', 75);
      setVideo75Tracked(true);
      console.log('[GA4] Video 75% watched tracked');
    }
  }
};

// Video element with tracking
<video 
  ref={videoRef}
  className="landing-page__video-player"
  controls
  preload="metadata"
  playsInline
  poster={whiteboardThumbnail}
  onTimeUpdate={handleVideoTimeUpdate}
>
  <source src={whiteboardAnimation} type="video/mp4" />
  Your browser does not support the video tag.
</video>
```

**Analytics Function:**

```javascript
// In src/utils/analytics.js
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
```

### Technical Details

1. **Event Trigger:** `onTimeUpdate` video event handler fires continuously as video plays
2. **Progress Calculation:** `(currentTime / duration) * 100`
3. **Duplicate Prevention:** State variable `video75Tracked` ensures event fires only once per session
4. **Consent Compliance:** ⚠️ **NO CONSENT REQUIRED** - Critical conversion event always tracks
5. **Console Logging:** Logs `[GA4] Video engagement tracked (no consent required)` for debugging
6. **Meta Pixel Integration:** Also fires custom Meta Pixel event for Facebook Ads optimization

### Why Track This?

Users who watch 75% of the demo video demonstrate:
- **High engagement** with product content
- **Strong purchase intent** - they're investing time to understand the product
- **Qualified leads** for retargeting campaigns
- **Conversion likelihood** - video engagement correlates with sign-ups

### Use Cases

1. **Retargeting Campaigns:** Create custom audiences of users who watched 75%+ of video
2. **Funnel Analysis:** Measure video engagement vs. sign-up conversion rates
3. **Content Optimization:** Understand which users engage deeply with video content
4. **Lead Scoring:** Assign higher scores to leads who watched majority of video

### Future Enhancement Opportunities

Additional video tracking events that could be implemented:

- **`Video_Play`** - User starts watching the video
- **`Video_25%_Watched`** - Early engagement indicator
- **`Video_50%_Watched`** - Mid-point engagement
- **`Video_Complete`** - User watches video to completion (100%)
- **`Video_Pause`** - User pauses video (could indicate confusion or distraction)
- **`Video_Replay`** - User replays video (strong interest indicator)

### Testing

**To verify tracking is working:**

1. Open browser console
2. Navigate to the ConsiderationLandingPage (ai-chiropractic-soap-notes route)
3. Accept cookie consent if prompted
4. Play the demo video
5. Seek to 75% or watch until 75% progress
6. Look for console message: `[GA4] Video 75% watched tracked`
7. Verify event appears in GA4 DebugView:
   - Category: `VideoEngagement`
   - Action: `Video_75%_Watched`
   - Label: `Consideration_Landing_Demo_Video`

### Related Files

- **Component:** `src/components/LandingPage/ConsiderationLandingPage.jsx`
- **Analytics Utility:** `src/utils/analytics.js`
- **Main Tracking Documentation:** `src/Tracking.md`

---

*Last Updated: October 23, 2025*
