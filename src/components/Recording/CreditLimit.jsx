import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CreditLimit.css';
import padlockImage from '../../assets/padlock.svg';

const CreditPopup = ({ onClose }) => {
  const navigate = useNavigate();

  const handleGoToAccount = () => {
    onClose();
    navigate('/account');
  };

  return (
    <div className="credit-popup-container">
      <img src={padlockImage} alt="Coins" className="padlock-image" />
      <h2 className="credit-popup-title">Out of Transcription Credits</h2>
      <p className="credit-popup-message">
        You've used all your transcription credits. Upgrade to a higher tier to
        continue using our services.
      </p>
      <button className="credit-popup-button" onClick={handleGoToAccount}>Go to Account Menu</button>
    </div>
  );
};

export default CreditPopup;
