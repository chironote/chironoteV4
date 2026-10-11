import { clearLegacyCredentials } from './credentialStorage';
afterEach(() => jest.restoreAllMocks());
test('blocked storage is tolerated and both obsolete keys are attempted without reads', () => {
  const get = jest.spyOn(Storage.prototype, 'getItem');
  const remove = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(() => clearLegacyCredentials()).not.toThrow();
  expect(remove.mock.calls).toEqual([['saved_email'], ['saved_password']]); expect(get).not.toHaveBeenCalled();
});
