import React, { useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';
import './PriceTable.css';

const StripePricingTable = () => {
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Add Stripe Pricing Table script
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/pricing-table.js';
    script.async = true;
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, []);

  useEffect(() => {
    Auth.currentAuthenticatedUser()
      .then(user => setUserEmail(user.attributes.email))
      .catch(error => console.error('Error fetching user email:', error));
  }, []);

  return (
    <div className="pricing-table-container">
      <stripe-pricing-table
        pricing-table-id="prctbl_1PnBmnGW9XarT1STkRJVEynp"
        publishable-key="pk_test_51OjRoLGW9XarT1STitbive9uLi8wemvrnBWCom1352qFV0pu87IzzFmE3eO1zxy4Qb8bA3xMwMojxMNUdVFoRnqX00j72cKeAO"
        customer-email={userEmail}
      />
    </div>
  );
};

export default StripePricingTable;