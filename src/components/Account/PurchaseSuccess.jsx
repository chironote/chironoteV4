import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Account.css';
import { trackPurchasedStandard, trackPurchasedProfessional } from '../../utils/analytics';

function PurchaseSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkout = searchParams.get('checkout');

  useEffect(() => {
    // Fire GA4 events based on plan
    if (checkout === 'inim') {
      trackPurchasedStandard();
    } else if (checkout === 'lluf') {
      trackPurchasedProfessional();
    }
  }, [checkout]);

  const planName = checkout === 'inim' ? 'Standard' : checkout === 'lluf' ? 'Professional' : '';

  return (
    <div className="account-container">
      <div className="account-content">
        <h1>Payment Confirmed! 🎉</h1>
        <p className="success-message">
          Your {planName} plan is now active. What would you like to do next?
        </p>

        <div className="success-actions">
          <button 
            className="success-button primary"
            onClick={() => navigate('/app/')}
          >
            Start Making Notes
          </button>
          
          <button 
            className="success-button secondary"
            onClick={() => navigate('/app/account')}
          >
            Back to Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default PurchaseSuccess;
