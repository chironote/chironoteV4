import ReactGA from 'react-ga4';
import { isNativePlatform } from '../services/nativePlatform';
import {
  trackEvent,
  trackMilestone,
  trackRecordingCompleted,
  trackSignUp,
  trackViewedCart
} from './analytics';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
  set: jest.fn()
}));

jest.mock('../services/nativePlatform', () => ({
  isNativePlatform: jest.fn()
}));

describe('native analytics boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('suppresses active analytics entry points in Capacitor', async () => {
    isNativePlatform.mockReturnValue(true);
    localStorage.setItem('cookieConsent', 'true');

    trackEvent('Recording', 'Start_Recording');
    await trackRecordingCompleted('user-1');
    await trackMilestone('user_activated_3notes', 'user-1');
    await trackSignUp('person@example.com', 'user-1');
    trackViewedCart('person@example.com', 'user-1');

    expect(ReactGA.event).not.toHaveBeenCalled();
    expect(ReactGA.set).not.toHaveBeenCalled();
    expect(localStorage.getItem('total_recordings')).toBeNull();
  });

  test('retains consent-gated web event tracking', () => {
    isNativePlatform.mockReturnValue(false);
    localStorage.setItem('cookieConsent', 'true');

    trackEvent('Recording', 'Start_Recording');

    expect(ReactGA.event).toHaveBeenCalledWith({
      category: 'Recording',
      action: 'Start_Recording'
    });
  });
});
