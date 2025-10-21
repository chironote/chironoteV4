# Quick Test Guide - ChiroNote

## 🚀 Run Tests in 10 Seconds

```bash
# Most common command - run all tests once
npm run test:all

# Watch mode - tests re-run when you save files
npm test

# Before deploying - run critical tests only
npm run test:critical
```

---

## ✅ Pre-Deployment Checklist (Copy & Paste)

```bash
# 1. Run critical tests
npm run test:critical

# 2. Run all tests  
npm run test:all

# 3. Verify all pass ✅
# If any fail, DO NOT DEPLOY
```

---

## 🐛 Found a Bug? Add a Test First

### Step 1: Create the test
```javascript
// In appropriate test file (Dictation.test.jsx or RecordingManager.test.jsx)
test('should fix [describe the bug]', async () => {
  // Setup
  const { container } = render(<YourComponent />);
  
  // Reproduce the bug
  // ... your test code ...
  
  // This should fail initially
  expect(result).toBe(expected);
});
```

### Step 2: Run in watch mode
```bash
npm test
# Test will fail (red) - that's good! Proves bug exists.
```

### Step 3: Fix the bug in source code
```javascript
// Fix the actual bug in Dictation.jsx or RecordingManager.jsx
```

### Step 4: Save and watch test pass
```
Test will turn green ✅ - bug fixed!
```

---

## 🔍 Common Test Scenarios

### Testing NoSleep Behavior
```javascript
import { getNoSleepInstance, expectNoSleepEnabled, expectNoSleepDisabled } from '../testing/testUtils';

test('NoSleep lifecycle', async () => {
  // Start recording
  expectNoSleepEnabled();
  
  // Stop recording  
  expectNoSleepDisabled();
});
```

### Testing WebSocket Billing
```javascript
import { expectNoWebSocket, expectWebSocketCreated } from '../testing/testUtils';

test('WebSocket only on recording', async () => {
  // Component mounts
  expectNoWebSocket(); // ✅ No billing
  
  // Start recording
  expectWebSocketCreated(); // ✅ Billing starts
});
```

### Testing Browser Compatibility
```javascript
import { setupBrowser } from '../testing/testUtils';

test('Firefox behavior', () => {
  setupBrowser('firefox');
  // ... test Firefox-specific code ...
});
```

---

## 🎯 Test Status = Deploy Status

| Test Result | Action |
|-------------|--------|
| ✅ All pass | **SAFE TO DEPLOY** |
| ⚠️ Critical fail | **DO NOT DEPLOY** |
| ❌ Some fail | **Investigate first** |

---

## 🔧 Debugging Failed Tests

### See detailed output:
```bash
npm test -- --verbose
```

### Run single test:
```bash
npm test -- --testNamePattern="exact test name"
```

### See console logs:
Edit `setupTests.js` and comment out console suppressions:
```javascript
// global.console = {
//   ...console,
//   log: jest.fn(),
// };
```

---

## 📊 Coverage Report

```bash
npm run test:coverage

# Look for:
# - Dictation.jsx: Should be >85%
# - RecordingManager.jsx: Should be >80%
# - Overall: Should be >80%
```

---

## 🧪 Specific Test Suites

```bash
# Test dictation component only
npm run test:dictation

# Test recording manager only
npm run test:recording

# Test integration flows
npm run test:integration

# Test note settings combinations
npm run test:settings

# Test edge cases
npm run test:edge
```

---

## 🎓 Test File Locations

```
src/
├── setupTests.js                          ← Mock configuration
├── testing/
│   ├── testUtils.js                      ← Helper functions
│   ├── Testing.md                        ← Original strategy doc
│   └── TESTING_README.md                 ← Full documentation
└── components/
    └── Recording/
        ├── Dictation.test.jsx            ← 21 tests
        ├── RecordingManager.test.jsx     ← 24 tests
        ├── Integration.test.jsx          ← 15+ tests
        ├── NoteSettings.test.jsx         ← 40+ tests
        └── EdgeCases.test.jsx            ← 20+ tests
```

---

## 💡 Quick Tips

1. **Always run tests before deploying**
   ```bash
   npm run test:critical
   ```

2. **Use watch mode during development**
   ```bash
   npm test
   ```

3. **Add test when fixing bugs**
   - Write test that fails
   - Fix bug
   - Test passes
   - Bug can't come back

4. **Trust the tests**
   - If tests pass, code works
   - If tests fail, code broken

---

## 🚨 Critical Tests (Never Skip These)

These prevent the most expensive bugs:

```bash
npm run test:critical
```

Tests:
- ✅ WebSocket billing prevention (7 tests)
- ✅ NoSleep battery drain prevention (7 tests)
- ✅ Firefox compatibility (3 tests)
- ✅ Page visibility handling (4 tests)

**If these fail, DO NOT DEPLOY.**

---

## 📞 Need Help?

1. **Check TESTING_README.md** - Full documentation
2. **Check testUtils.js** - Available helper functions
3. **Check existing tests** - See examples
4. **Check setupTests.js** - See what's mocked

---

## ⚡ TL;DR

```bash
# Before you commit:
npm run test:critical

# Before you deploy:
npm run test:all

# If tests fail:
DO NOT DEPLOY - FIX FIRST

# If tests pass:
SAFE TO DEPLOY ✅
```

---

**Remember:** 30 seconds of testing prevents 2+ hours of debugging in production. 🎯
