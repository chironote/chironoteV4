import React, { useEffect, useState } from 'react';
import './CookieConsent.css';
import ReactGA from 'react-ga4';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if consent has been given
    const hasConsent = localStorage.getItem('cookieConsent');
    if (!hasConsent) {
      setVisible(true);
    } else {
      // If consent was previously given, initialize GA with cookies
      initializeGAWithConsent();
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'true');
    setVisible(false);
    initializeGAWithConsent();
  };

  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'false');
    setVisible(false);
    // Keep GA initialized with cookies disabled
  };

  const initializeGAWithConsent = () => {
    // Reinitialize Google Analytics with cookies enabled
    try {
      ReactGA.initialize("G-02117DNZDH", {
        client_storage: 'localStorage', // Enable cookies
        anonymize_ip: false // Don't anonymize IP
      });
      // Send pageview
      ReactGA.send({ hitType: "pageview", page: window.location.pathname });
    } catch (error) {
      console.error("Error initializing Google Analytics with consent:", error);
    }
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent">
      <div className="cookie-content">
        <h3>Cookie Consent</h3>
        <p>
          This website uses cookies to enhance your experience and to analyze our traffic. 
          By clicking "Accept", you consent to our use of cookies for analytics purposes.
        </p>
        <div className="cookie-buttons">
          <button onClick={acceptCookies} className="accept-button">Accept</button>
          <button onClick={declineCookies} className="decline-button">Decline</button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
