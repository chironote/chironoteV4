import { webcrypto } from 'crypto';
import {
  createPrivacySafeDeviceHash,
  getAppliedTrackSettings,
  getRecordingClientContext
} from './recordingTelemetryContext';

const RECORDING_JOB_ID = '8c458d93-1125-4e28-9cd1-357fc49f3342';

describe('recording telemetry context', () => {
  test.each([
    [
      'android webview',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UP1A; wv) Version/4.0 Chrome/124.0 Mobile Safari/537.36',
      { browser: 'webview', platform: 'android', source: 'client.android' }
    ],
    [
      'iOS Chrome',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1',
      { browser: 'chrome', platform: 'ios', source: 'client.ios' }
    ],
    [
      'desktop Firefox',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
      { browser: 'firefox', platform: 'web', source: 'client.web' }
    ]
  ])('classifies %s without retaining the user agent', (description, userAgent, expected) => {
    expect(getRecordingClientContext({ userAgent })).toMatchObject(expected);
    expect(getRecordingClientContext({ userAgent })).not.toHaveProperty('userAgent');
  });

  test('creates a per-job device hash without returning device material', async () => {
    const track = {
      kind: 'audio',
      label: 'Synthetic Person Headset',
      getSettings: () => ({
        channelCount: 1,
        deviceId: 'direct-device-id',
        echoCancellation: false,
        groupId: 'direct-group-id',
        sampleRate: 48000
      })
    };

    const firstHash = await createPrivacySafeDeviceHash(track, RECORDING_JOB_ID, webcrypto);
    const secondHash = await createPrivacySafeDeviceHash(
      track,
      '3b732ac1-1376-4bd6-a1bc-cab3ec611991',
      webcrypto
    );

    expect(firstHash).toMatch(/^[a-f0-9]{24}$/);
    expect(firstHash).not.toBe(secondHash);
    expect(firstHash).not.toContain('direct-device-id');
    expect(getAppliedTrackSettings(track)).toEqual({
      channelCount: 1,
      echoCancellation: false,
      sampleRate: 48000
    });
  });

  test('normalizes unsafe build metadata before it reaches the strict event schema', () => {
    const previousBuild = process.env.REACT_APP_BUILD_VERSION;
    process.env.REACT_APP_BUILD_VERSION = 'feature/PHI telemetry build';
    try {
      expect(getRecordingClientContext({ userAgent: '' }).appBuild).toBe(
        'feature-PHI-telemetry-build'
      );
    } finally {
      if (previousBuild === undefined) {
        delete process.env.REACT_APP_BUILD_VERSION;
      } else {
        process.env.REACT_APP_BUILD_VERSION = previousBuild;
      }
    }
  });
});
