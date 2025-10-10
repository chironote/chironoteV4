import React, { useEffect, useState } from 'react';
import './CreditLimit.css';

const CreditPopup = ({ onClose }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="credit-limit-popup-content">
      <h2 className="credit-popup-title">{isOffline ? "No Internet Connection" : "Out of Credits"}</h2>
      <p className="credit-popup-message">
        {isOffline 
          ? "Unable to verify your login credentials. Please check your internet connection and try again."
          : "We are sorry you are out of credits."}
      </p>
      <button className="credit-popup-button" onClick={handleClose}>
        Close
      </button>
    </div>
  );
};

export default CreditPopup;
