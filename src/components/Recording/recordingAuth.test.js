import { fetchAuthSession } from 'aws-amplify/auth';
import { generateToken, getRecordingAuth } from './recordingAuth';

jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn(), getCurrentUser: jest.fn() }));

const session = owner => ({ credentials: { accessKeyId: 'fictional' }, tokens: { accessToken: { payload: { sub: owner }, toString: () => 'fictional-token' } } });
beforeEach(() => jest.clearAllMocks());

test('reads current credentials/token together and refreshes on retry without logging tokens', async () => {
  fetchAuthSession.mockResolvedValue(session('owner'));
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  expect(await getRecordingAuth('owner', true)).toEqual({ credentials: { accessKeyId: 'fictional' }, accessToken: 'fictional-token' });
  expect(fetchAuthSession).toHaveBeenLastCalledWith({ forceRefresh: true });
  await generateToken();
  expect(log).not.toHaveBeenCalled();
  log.mockRestore();
});

test('missing credentials and temporary refresh failures reject instead of signaling success', async () => {
  fetchAuthSession.mockResolvedValue({ ...session('owner'), credentials: undefined });
  await expect(getRecordingAuth('owner')).rejects.toMatchObject({ name: 'RecordingAuthUnavailable' });
  fetchAuthSession.mockRejectedValue(new TypeError('Network unavailable'));
  await expect(getRecordingAuth('owner', true)).rejects.toThrow('Network unavailable');
});

test('never supplies another account credentials for a retained recording', async () => {
  fetchAuthSession.mockResolvedValue(session('other'));
  await expect(getRecordingAuth('owner', true)).rejects.toMatchObject({ name: 'RecordingOwnerMismatch' });
});
