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
  console.log(accessToken);
  return accessToken;
}

export async function getAwsCredentials() {
  const session = await fetchAuthSession();
  return session.credentials;
}
