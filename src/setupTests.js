import { randomFillSync, randomUUID } from 'crypto';

// jsdom does not expose Web Crypto in this repository's Jest version. Keep the
// test environment aligned with the secure browser context required by media capture.
if (typeof window !== 'undefined' && typeof window.crypto?.getRandomValues !== 'function') {
  Object.defineProperty(window, 'crypto', {
    configurable: true,
    value: {
      getRandomValues: (bytes) => randomFillSync(bytes),
      randomUUID
    }
  });
}
