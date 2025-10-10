// Analytics disabled: no-op implementations to preserve imports without tracking
export const trackEvent = (_category, _action, _label = null, _value = null) => {};

// App button clicks (formerly landing page)
export const trackAppButtonClick = (_actionName) => {};

// Recording actions
export const trackRecordingStart = () => {};

// Navigation 
export const trackPageView = (_pageName) => {};

// Note editing
export const trackApplyChanges = () => {};

// Dictation
export const trackDictationStart = () => {};

// Account page interactions
export const trackAccountPageInteraction = (_actionName) => {};
