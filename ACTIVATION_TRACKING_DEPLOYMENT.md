# Activation Tracking Deployment Instructions

## Overview

This document provides step-by-step instructions for deploying the activation tracking system that monitors user engagement through three key conversion events:

1. **`sign_up`** - Account creation (PRIMARY CONVERSION)
2. **`user_activated_3notes`** - 3 notes milestone (EARLY ADOPTER)
3. **`user_activated_5notes`** - 5 notes milestone (POWER USER)

## What Was Implemented

### 1. Schema Changes
**File:** `amplify/backend/api/chironotev4/schema.graphql`

Added four fields to the `UserSubscription` table:
- `hoursSaved` (Float) - Total hours saved by user (for Account page display)
- `isActivated` (Boolean) - Controls tutorial visibility and sign_up event tracking
- `has3Notes` (Boolean) - Tracks 3-note milestone completion
- `has5Notes` (Boolean) - Tracks 5-note milestone completion

### 2. Analytics Function
**File:** `src/utils/analytics.js`

Added `trackMilestone()` function for tracking note milestones. These are critical conversion events that fire regardless of cookie consent.

### 3. IntroTour Component
**File:** `src/components/IntroTour/IntroTour.jsx`

Updated to:
- Check `isActivated` field on component mount
- Fire `sign_up` GA4 event on first tutorial load
- Update `isActivated` to `true` after tutorial completion
- Skip tutorial for returning users

### 4. App.jsx Component
**File:** `src/App.jsx`

Added:
- `checkNoteMilestones()` helper function
- Milestone tracking in note subscription handler
- Automatic checks when notes are saved

### 5. Account Component
**File:** `src/components/Account/Account.jsx`

Updated to:
- Add `hoursSaved` state variable
- Fetch `hoursSaved` from UserSubscription
- Ready for display on Account page (currently stored but not displayed)

---

## Deployment Steps

### STEP 1: Backup Current Schema

Before making any changes, create a backup of your current schema:

```bash
cd c:\ChiroNote\Code\chironote
cp amplify\backend\api\chironotev4\schema.graphql amplify\backend\api\chironotev4\schema.graphql.backup
```

### STEP 2: Verify Schema Changes

Open `amplify/backend/api/chironotev4/schema.graphql` and verify the UserSubscription type includes the new fields:

```graphql
type UserSubscription @model(timestamps: null) @auth(rules: [{ allow: owner }]) {
  owner: String! @primaryKey
  tier: String!
  hoursleft: Float!
  notesleft: Int
  hoursSaved: Float        # Total hours saved by user (for Account page display)
  isActivated: Boolean     # Controls tutorial visibility and sign_up event tracking
  has3Notes: Boolean       # Tracks 3-note milestone completion (early adopter)
  has5Notes: Boolean       # Tracks 5-note milestone completion (power user)
}
```

### STEP 3: Deploy Schema to AWS

Push the updated schema to your AWS backend:

```bash
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
? Choose the code generation language target:
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

**Deployment will take 5-15 minutes.** The process will:
- Update CloudFormation stack
- Migrate DynamoDB table
- Update AppSync API
- Generate GraphQL operations

### STEP 4: Verify Backend Deployment

After deployment completes:

#### 4.1 Check AWS AppSync Console
1. Open AWS AppSync Console
2. Navigate to your API
3. Go to **Schema** tab
4. Verify `hoursSaved`, `isActivated`, `has3Notes`, `has5Notes` fields exist in UserSubscription type

#### 4.2 Check DynamoDB
1. Open DynamoDB Console
2. Find your UserSubscription table (e.g., `UserSubscription-xxxxx-dev`)
3. The table now supports the new fields (they'll appear when data is written)

#### 4.3 Test in AppSync Queries
Run this test query in AppSync console:

```graphql
query GetUserSubscription {
  getUserSubscription(owner: "your-user-id") {
    owner
    tier
    hoursSaved
    isActivated
    has3Notes
    has5Notes
  }
}
```

### STEP 5: Verify Generated GraphQL Files

Check that the new fields appear in your local GraphQL operations:

#### 5.1 Check `src/graphql/queries.js`
Open the file and verify `getUserSubscription` includes the new fields:

```javascript
export const getUserSubscription = /* GraphQL */ `
  query GetUserSubscription($owner: String!) {
    getUserSubscription(owner: $owner) {
      owner
      tier
      hoursleft
      notesleft
      hoursSaved
      isActivated
      has3Notes
      has5Notes
      __typename
    }
  }
`;
```

#### 5.2 Check `src/graphql/mutations.js`
Verify `updateUserSubscription` includes the new fields:

```javascript
export const updateUserSubscription = /* GraphQL */ `
  mutation UpdateUserSubscription(
    $input: UpdateUserSubscriptionInput!
    $condition: ModelUserSubscriptionConditionInput
  ) {
    updateUserSubscription(input: $input, condition: $condition) {
      owner
      tier
      hoursleft
      notesleft
      hoursSaved
      isActivated
      has3Notes
      has5Notes
      __typename
    }
  }
`;
```

### STEP 6: Test the Implementation

#### 6.1 Test Sign-Up Tracking
1. Create a new test account
2. Open browser console (F12)
3. Look for: `[GA4] Sign-up conversion tracked on first tutorial load`
4. Complete or skip tutorial
5. Refresh page
6. Verify tutorial does NOT show again
7. Check DynamoDB: `isActivated` should be `true`

#### 6.2 Test 3-Note Milestone
1. Using test account, create 1st note
2. Create 2nd note
3. Create 3rd note → Look for: `[GA4] 🎉 Early adopter! 3 notes milestone reached`
4. Check DynamoDB: `has3Notes` should be `true`
5. Create more notes → Verify milestone does NOT fire again

#### 6.3 Test 5-Note Milestone
1. Continue with same test account
2. Create 4th note
3. Create 5th note → Look for: `[GA4] 🎉 Power user! 5 notes milestone reached`
4. Check DynamoDB: `has5Notes` should be `true`
5. Create more notes → Verify milestone does NOT fire again

#### 6.4 Verify GA4 Events
1. Open GA4 → Configure → DebugView
2. Filter by your test user
3. Verify these events appear:
   - `sign_up` (with email parameter)
   - `user_activated_3notes` (on 3rd note)
   - `user_activated_5notes` (on 5th note)

---

## Troubleshooting

### Issue: Fields not appearing in GraphQL operations

**Solution:**
```bash
amplify codegen
```
This regenerates the GraphQL files.

### Issue: CloudFormation stack update fails

**Solution:**
1. Check AWS Console → CloudFormation
2. View stack events for error details
3. Common causes:
   - Insufficient permissions
   - Conflicting resource names
   - Schema syntax errors

### Issue: DynamoDB fields not updating

**Solution:**
1. Verify subscription ID matches user ID (owner field)
2. Check user has proper authentication
3. Verify IAM permissions for owner-based access
4. Test with AppSync console directly

### Issue: Tutorial shows every time despite isActivated = true

**Solution:**
1. Check subscription query returns data
2. Verify userId matches subscription owner
3. Add defensive checks for null/undefined
4. Clear browser localStorage as test

### Issue: Milestone events fire multiple times

**Solution:**
1. Check database flags are being set correctly
2. Verify subscription query includes has3Notes/has5Notes
3. Check for race conditions in subscription handler
4. Add additional logging to track event flow

---

## Rollback Plan

If deployment causes issues:

### Option 1: Revert Schema
```bash
# Restore backup
cp amplify\backend\api\chironotev4\schema.graphql.backup amplify\backend\api\chironotev4\schema.graphql

# Push reverted schema
amplify push
```

### Option 2: Revert Code
```bash
git revert [commit-hash]
git push origin main
```

### Option 3: Keep Backend, Remove Frontend
- Comment out milestone tracking code in App.jsx
- Comment out sign_up tracking in IntroTour.jsx
- Keep backend fields (they won't cause issues)
- Re-enable when ready

---

## Post-Deployment Checklist

- [ ] Schema deployed successfully to AWS
- [ ] New fields visible in AppSync console
- [ ] GraphQL operations regenerated with new fields
- [ ] IntroTour component fires sign_up event
- [ ] Tutorial doesn't show after completion
- [ ] App.jsx tracks 3-note milestone
- [ ] App.jsx tracks 5-note milestone
- [ ] Test account created and verified
- [ ] `sign_up` event fires on first tutorial
- [ ] `user_activated_3notes` fires on 3rd note
- [ ] `user_activated_5notes` fires on 5th note
- [ ] Events visible in GA4 DebugView
- [ ] DynamoDB fields updating correctly
- [ ] No console errors in production
- [ ] CloudWatch logs clean
- [ ] Documentation updated
- [ ] Team notified of changes

---

## Success Criteria

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

## Google Ads Configuration

After deployment, configure Google Ads to use these conversion events:

### 1. Mark as Key Events in GA4
1. Go to **Admin** → **Events**
2. Find `sign_up` → Toggle **"Mark as key event"**
3. Wait 24-48 hours for `user_activated_3notes` to appear
4. Find `user_activated_3notes` → Toggle **"Mark as key event"**
5. Wait 24-48 hours for `user_activated_5notes` to appear
6. Find `user_activated_5notes` → Toggle **"Mark as key event"**

### 2. Import to Google Ads
1. **Goals** → **Conversions** → **+ New conversion action**
2. Select **Import** → **Google Analytics 4**
3. Import `sign_up` key event
   - Value: $5
   - Count: One
4. Import `user_activated_3notes` key event
   - Value: $20
   - Count: One
5. Import `user_activated_5notes` key event
   - Value: $75
   - Count: One

### 3. Campaign Optimization Strategy

**Phase 1: Volume (First 30 Days)**
- Target: `sign_up` conversion
- Goal: 100+ sign-ups for data collection
- Bidding: Maximize conversions

**Phase 2: Early Engagement (After 30 Days)**
- Target: `user_activated_3notes` conversion
- Goal: Users who return and demonstrate early adoption
- Bidding: Maximize conversion value

**Phase 3: Power Users (After 60 Days)**
- Target: `user_activated_5notes` conversion
- Goal: Users who integrate product into workflow
- Bidding: Maximize conversion value

---

## Support

For issues or questions:
1. Check CloudWatch logs for backend errors
2. Check browser console for frontend errors
3. Review GA4 DebugView for tracking issues
4. Consult Tracking.md for detailed documentation

---

## Related Documentation

- **Tracking.md** - Complete tracking implementation documentation
- **Context.md** - Project context and architecture
- **schema.graphql** - GraphQL schema definition
