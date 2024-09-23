// Navigation links
export const NAV_LINKS = [
  { name: 'Home', path: '/', icon: "home" },
  { name: 'Account', path: '/account', icon: "person" },
  { name: 'Feedback', path: '/feedback', icon: "add_comment" },
  { name: 'Log Out', action: 'logout', icon: "logout" }
];

// List of available subscription plans
export const PLANS = ['free', 'standard', 'pro'];

// Features based on the plan
export const PLAN_FEATURES = {
  free: ['Slow Clinic'],
  standard: ['Busy Clinic '],
  pro: ['Booked Solid']
};

// Helper function to get features based on the plan
export const getPlanFeatures = (plan) => {
  return PLAN_FEATURES[plan] || [];
};

