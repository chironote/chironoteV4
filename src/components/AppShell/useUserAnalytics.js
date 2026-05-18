import { useEffect } from 'react';
import { Hub } from 'aws-amplify/utils';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { setUserProperties, trackSignUp } from '../../utils/analytics';

function useUserAnalytics(username) {
  useEffect(() => {
    const setUserData = async () => {
      try {
        const userAttributes = await fetchUserAttributes();
        const email = userAttributes.email;
        const userId = userAttributes.sub;

        await setUserProperties(userId, email);

        console.log('[GA4] User properties set:', { userId, email });
      } catch (error) {
        console.error('Error setting user properties:', error);
      }
    };

    setUserData();
  }, [username]);

  useEffect(() => {
    const authListener = Hub.listen('auth', async (data) => {
      const { payload } = data;

      if (payload.event === 'signUp') {
        try {
          const userAttributes = await fetchUserAttributes();
          const email = userAttributes.email;
          const userId = userAttributes.sub;

          await trackSignUp(email, userId);

          console.log('[GA4] Sign-up conversion tracked:', { email, userId });
        } catch (error) {
          console.error('Error tracking sign-up:', error);
        }
      }
    });

    return () => authListener();
  }, []);
}

export default useUserAnalytics;
