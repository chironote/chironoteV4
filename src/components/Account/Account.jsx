import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Account.css';
import config from '../../amplifyconfiguration.json';
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { getUserSubscription } from '../../graphql/queries';
import { Amplify } from 'aws-amplify';
import { trackPageView } from '../../utils/analytics';
// Plan constants moved here from constants.js
const PLANS = ['free', 'standard', 'pro'];

Amplify.configure(config);

const client = generateClient();

function Account({ setCurrentPage }) {
  const [name, setName] = useState('');
  const [currentPlan, setCurrentPlan] = useState('');
  const [remainingHours, setRemainingHours] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isQueryLoading, setIsQueryLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Track page view when the Account component mounts
    trackPageView('Account_Page');
    
    // Set the current page in the parent component
    if (setCurrentPage) {
      setCurrentPage('account');
    }
    
    // Fetch user data
    fetchUserSubscription();
  }, [setCurrentPage]);

  async function fetchUserSubscription() {
    setIsQueryLoading(true);
    try {
      const userAttributes = await fetchUserAttributes();
      const owner = userAttributes.sub;

      const data = await client.graphql({
        query: getUserSubscription,
        variables: { owner: owner }
      });
      const currentTier = data.data.getUserSubscription.tier.toLowerCase();
      const hoursLeft = data.data.getUserSubscription.hoursleft;
      
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
      console.error('Error getting user email:', err);
      return null;
    }
  }

  const handlePlanAction = async () => {
    if (currentPlan === 'free') {
      navigate('/app/pricingplans');
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
      <h1>Your Account</h1>

      {/* Subscription management */}
      <div className="subscription-info">
        <h2>Subscription Plans</h2>

        {/* Plan comparison table */}
        <div className="plan-comparison-table">
          <table className="highlight-plan-table">
            <thead>
              {/* Tick Row */}
              <tr className="tick-row">
                <th></th>
                <th className={currentPlan === 'free' ? 'plan-active' : ''}>
                  {currentPlan === 'free' && <span className="plan-check plan-check-row">✔</span>}
                </th>
                <th className={currentPlan === 'standard' ? 'plan-active' : ''}>
                  {currentPlan === 'standard' && <span className="plan-check plan-check-row">✔</span>}
                </th>
                <th className={currentPlan === 'pro' ? 'plan-active' : ''}>
                  {currentPlan === 'pro' && <span className="plan-check plan-check-row">✔</span>}
                </th>
              </tr>
              {/* Plan Names Row */}
              <tr>
                <th></th>
                <th className={currentPlan === 'free' ? 'plan-active' : ''}>
                  <div className="plan-name">Free</div>
                  <div className="plan-desc">Essential Care</div>
                </th>
                <th className={currentPlan === 'standard' ? 'plan-active' : ''}>
                  <div className="plan-name">Standard</div>
                  <div className="plan-desc">Enhanced Practice</div>
                </th>
                <th className={currentPlan === 'pro' ? 'plan-active' : ''}>
                  <div className="plan-name">Professional</div>
                  <div className="plan-desc">Total Automation</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="row-label">Price</td>
                <td className={currentPlan === 'free' ? 'plan-active' : ''} data-category="Price">No Charge</td>
                <td className={currentPlan === 'standard' ? 'plan-active' : ''} data-category="Price">$19/mo</td>
                <td className={currentPlan === 'pro' ? 'plan-active' : ''} data-category="Price">$75/mo</td>
              </tr>
              <tr>
                <td className="row-label">Dictation Hours</td>
                <td className={currentPlan === 'free' ? 'plan-active' : ''} data-category="Dictation Hours">1 hour/month</td>
                <td className={currentPlan === 'standard' ? 'plan-active' : ''} data-category="Dictation Hours">15 hours/month</td>
                <td className={currentPlan === 'pro' ? 'plan-active' : ''} data-category="Dictation Hours">Unlimited</td>
              </tr>
              <tr>
                <td className="row-label">Note Edits</td>
                <td className={currentPlan === 'free' ? 'plan-active' : ''} data-category="Note Edits">Up to 15</td>
                <td className={currentPlan === 'standard' ? 'plan-active' : ''} data-category="Note Edits">Unlimited</td>
                <td className={currentPlan === 'pro' ? 'plan-active' : ''} data-category="Note Edits">Unlimited</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button 
          className="manage-plan-btn" 
          onClick={handlePlanAction}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : (currentPlan === 'free' ? 'Browse Available Plans' : 'Manage Billing')}
        </button>

        {/* Hours remaining this month */}
        <div className="hours-remaining">
          <h3>Hours Remaining this month</h3>
          <div className="hours-box">
            {currentPlan === 'pro' ? (
              <>
                <span id="hours">∞</span>
                <span className="hours-label">Unlimited</span>
              </>
            ) : (
              <>
                <span id="hours">{remainingHours < 0 ? '0' : remainingHours.toFixed(1)}</span>
                <span className="hours-label">Hrs</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;
