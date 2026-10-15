import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export async function getUserId() {
  try {
    const userId = (await getCurrentUser()).userId;
    console.log('Current session ID:' + userId);
    return userId;
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function generateToken() {
  const session = await fetchAuthSession();
  const accessToken = session.tokens.accessToken.toString();
  return accessToken;
}

// Read credentials and the token together, immediately before a request. Never
// attach a retained recording to whichever account happens to be signed in later.
export async function getRecordingAuth(owner, forceRefresh = false) {
  const session = await fetchAuthSession({ forceRefresh });
  const currentOwner = session.tokens?.accessToken?.payload?.sub;
  if (currentOwner && currentOwner !== owner) {
    const error = new Error('Sign in to the original recording account to retry.');
    error.name = 'RecordingOwnerMismatch';
    throw error;
  }
  if (!currentOwner || !session.credentials || !session.tokens?.accessToken) {
    const error = new Error('Recording authentication is temporarily unavailable.');
    error.name = 'RecordingAuthUnavailable';
    throw error;
  }
  return { credentials: session.credentials, accessToken: session.tokens.accessToken.toString() };
}

export async function getAwsCredentials() {
  const session = await fetchAuthSession();
  return session.credentials;
}
