import { clearLegacyCredentials } from './CredentialManager';

jest.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: jest.fn(() => 'web') },
  registerPlugin: jest.fn(() => ({})),
}));

describe('CredentialManager legacy cleanup', () => {
  it('idempotently removes both plaintext credential keys', () => {
    const storage = {
      removeItem: jest.fn(),
    };

    clearLegacyCredentials(storage);
    clearLegacyCredentials(storage);

    expect(storage.removeItem).toHaveBeenCalledTimes(4);
    expect(storage.removeItem).toHaveBeenNthCalledWith(1, 'saved_email');
    expect(storage.removeItem).toHaveBeenNthCalledWith(2, 'saved_password');
    expect(storage.removeItem).toHaveBeenNthCalledWith(3, 'saved_email');
    expect(storage.removeItem).toHaveBeenNthCalledWith(4, 'saved_password');
  });
});
