import React, { useEffect, useState } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';
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
    const getUserEmail = async () => {
      try {
        const userAttributes = await fetchUserAttributes();
        setUserEmail(userAttributes.email);
      } catch (error) {
        console.error('Error fetching user email:', error);
      }
    };
    getUserEmail();
  }, []);

  return (
    <div className="pricing-table-container">
      <stripe-pricing-table
        pricing-table-id="prctbl_1Q9wgoFLOk2JuI9KM1oFMtc8"
        publishable-key="pk_live_51Q9vo5FLOk2JuI9K9y0ckzpjY5OZkBbXaB8QJtS4vUw2W1qYtXs6xCjjrYmi0gjg0VbWgohyT25kC5ReKnB9dRSY006LfWlZ7N"
        customer-email={userEmail}
      />
    </div>
  );
};

export default StripePricingTable;
