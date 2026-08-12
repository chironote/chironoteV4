import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export async function getUserId() {
  try {
    const userId = (await getCurrentUser()).userId;
    return userId;
  } catch {
    console.error('Unable to resolve authenticated recording user');
    return null;
  }
}

export async function generateToken() {
  const session = await fetchAuthSession();
  const accessToken = session.tokens.accessToken.toString();
  return accessToken;
}

export async function getAwsCredentials() {
  const session = await fetchAuthSession();
  return session.credentials;
}
