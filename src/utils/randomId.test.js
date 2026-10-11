import { randomId } from './randomId';
const originalCrypto = global.crypto;
afterEach(() => Object.defineProperty(global, 'crypto', { configurable: true, value: originalCrypto }));
test('uses native randomUUID when available', () => {
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'native-uuid' } });
  expect(randomId()).toBe('native-uuid');
});
test('old WebViews use secure bytes and correct UUID version/variant bits', () => {
  const getRandomValues = jest.fn(bytes => { bytes.fill(255); return bytes; });
  Object.defineProperty(global, 'crypto', { configurable: true, value: { getRandomValues } });
  expect(randomId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  expect(getRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
  expect(getRandomValues.mock.calls[0][0]).toHaveLength(16);
});
test('fails closed rather than generating weak or duplicate identifiers', () => {
  Object.defineProperty(global, 'crypto', { configurable: true, value: undefined });
  expect(randomId).toThrow('Secure identifiers are unavailable');
});
