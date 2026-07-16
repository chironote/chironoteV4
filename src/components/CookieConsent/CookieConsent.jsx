import React, { useEffect, useState } from 'react';
import './CookieConsent.css';
import { getAnalyticsConsent, updateAnalyticsConsent } from '../../utils/analytics';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getAnalyticsConsent() === null);
  }, []);

  const acceptCookies = () => {
    updateAnalyticsConsent(true);
    setVisible(false);
  };

  const declineCookies = () => {
    updateAnalyticsConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section
      className="cookie-consent"
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="cookie-content">
        <h3 id="cookie-consent-title">Your privacy choices</h3>
        <p id="cookie-consent-description">
          Optional analytics and advertising storage helps us understand which pages and features are useful. Declining keeps that storage disabled.
        </p>
        <div className="cookie-buttons">
          <button type="button" onClick={acceptCookies} className="accept-button">Accept</button>
          <button type="button" onClick={declineCookies} className="decline-button">Decline</button>
        </div>
      </div>
    </section>
  );
};

export default CookieConsent;
