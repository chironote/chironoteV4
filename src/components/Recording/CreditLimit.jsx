import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreditLimit.css';

const CreditPopup = ({ onClose }) => {
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [countdown, setCountdown] = useState(10);

  // Check for internet connection
  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    // Add event listeners for online/offline status
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Initial check
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  // Automatically redirect to account page when component mounts
  useEffect(() => {
    if (isOffline) {
      // Don't redirect if offline, just close the popup
      return;
    }

    // Create countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Redirect after countdown reaches 0
    const redirectTimer = setTimeout(() => {
      onClose();
      navigate('/app/account');
    }, 10000); // Redirect after 10 seconds

    return () => {
      clearTimeout(redirectTimer);
      clearInterval(countdownInterval);
    }; // Clean up timers on unmount
  }, [navigate, onClose, isOffline]);

  const handleGoToAccount = () => {
    onClose();
    if (!isOffline) {
      navigate('/app/account');
    }
  };

  return (
    <div className="credit-limit-popup-content">
      <h2 className="credit-popup-title">{isOffline ? "No Internet Connection" : "Out of Credits"}</h2>
      <p className="credit-popup-message">
        {isOffline 
          ? "Unable to verify your subscription status. Please check your internet connection and try again."
          : "You've used all your transcription hours or notes. Upgrade to a higher tier to increase your limits."}
      </p>
      {!isOffline && (
        <p className="credit-popup-redirect">
          Redirecting to Account page in {countdown} seconds...
        </p>
      )}
      <button className="credit-popup-button" onClick={handleGoToAccount}>
        {isOffline ? "Close" : "Go to Account Menu"}
      </button>
    </div>
  );
};

export default CreditPopup;
