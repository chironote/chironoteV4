import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Account.css';
import { PLANS, getPlanFeatures } from '../../constants/constants';
import config from '../../amplifyconfiguration.json';
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { getUserSubscription } from '../../graphql/queries';
import { Amplify } from 'aws-amplify';

Amplify.configure(config);

const client = generateClient();

// Component to render individual subscription options
const SubscriptionOption = ({ plan, isActive }) => (
  <div className={`subscription-option ${isActive ? 'active' : ''}`}>
    <div className="option-name">{plan.toUpperCase()}</div>
    <div className="option-features">
      <ul>
        {getPlanFeatures(plan).map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
    </div>
  </div>
);

function Account({ setCurrentPage }) {
  const [name, setName] = useState('');
  const [currentPlan, setCurrentPlan] = useState('');
  const [remainingHours, setRemainingHours] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isQueryLoading, setIsQueryLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserSubscription();
  }, []);

  async function fetchUserSubscription() {
    setIsQueryLoading(true);
    try {
      const userAttributes = await fetchUserAttributes();
      const owner = userAttributes.sub;
      console.log('User id:', owner);

      const data = await client.graphql({
        query: getUserSubscription,
        variables: { owner: owner }
      });
      console.log(data);
      const currentTier = data.data.getUserSubscription.tier.toLowerCase();
      const hoursLeft = data.data.getUserSubscription.hoursleft;
      console.log('Current Tier:', currentTier);
      console.log('Hours Left:', hoursLeft);
      
      setCurrentPlan(currentTier);
      setRemainingHours(hoursLeft || 0);
    } catch (err) {
      console.error('Error fetching user subscription:', err);
    } finally {
      setIsQueryLoading(false);
    }
  }

  async function getUserEmail() {
    try {
      const userEmail = (await getCurrentUser()).signInDetails.loginId;
      return userEmail;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  const handlePlanAction = async () => {
    if (currentPlan === 'free') {
      navigate('/pricingplans');
    } else {
      setIsLoading(true);
      try {
        const userEmail = await getUserEmail();
        
        const response = await fetch('https://uvhaoef2myno3o4wvgyb32e5ae0dlevu.lambda-url.us-east-2.on.aws/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userEmail,
            // Add any other necessary data for the checkout process
          }),
        });

        if (!response.ok) {
          throw new Error('Checkout process failed');
        }

        const result = await response.text();
        console.log('Checkout successful, opening in new tab:', result);
        window.open(result, '_blank');
      } catch (error) {
        console.error('Error during checkout:', error);
        // Handle error (e.g., show error message to user)
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="account-container">
      {isQueryLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      <h1>Account Information</h1>

      {/* Subscription management */}
      <div className="subscription-info">
        <h2>Subscription Plans</h2>
        <div className="subscription-status">
          {/* Render subscription options */}
          {PLANS.map((plan) => (
            <SubscriptionOption
              key={plan}
              plan={plan}
              isActive={currentPlan === plan.toLowerCase()}
            />
          ))}
        </div>
        <button 
          className="manage-plan-btn" 
          onClick={handlePlanAction}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : (currentPlan === 'free' ? 'Browse Available Plans' : 'Manage Plan')}
        </button>

        {/* Hours remaining this month */}
        <div className="hours-remaining">
          <h3>Hours Remaining this month</h3>
          <div className="hours-box">
            <span id="hours">{remainingHours.toFixed(1)}</span>
            <span className="hours-label">Hrs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;
