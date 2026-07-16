import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Account.css';
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { getUserSubscription } from '../../graphql/queries';
import { trackPageView, trackAccountPageButtonClick } from '../../utils/analytics';

const client = generateClient();

function Account({ setCurrentPage }) {
  const [currentPlan, setCurrentPlan] = useState('');
  const [remainingHours, setRemainingHours] = useState(0);
  const [notesLeft, setNotesLeft] = useState(0);
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
      const notesLeftValue = data.data.getUserSubscription.notesleft;
      
      setCurrentPlan(currentTier);
      setRemainingHours(hoursLeft || 0);
      setNotesLeft(notesLeftValue || 0);
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
      trackAccountPageButtonClick('Click_Account_BrowsePlans');
      navigate('/app/pricingplans');
    } else {
      trackAccountPageButtonClick('Click_Account_ManageBilling');
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

        {/* Plan cards */}
        <div className="plan-cards-container">
          {/* Free Plan */}
          <div className={`plan-card ${currentPlan === 'free' ? 'plan-active' : 'plan-inactive'}`}>
            <div className="plan-header">
              {currentPlan === 'free' && <span className="plan-check">✓</span>}
              <div className="plan-name">Free</div>
              <div className="plan-desc">Essential Care</div>
            </div>
            <div className="plan-price">No Charge</div>
            <div className="plan-features">
              <div className="feature-item">
                <span className="feature-label">Dictation Hours</span>
                <span className="feature-value">1 hour/month</span>
              </div>
              <div className="feature-item">
                <span className="feature-label">Note Edits</span>
                <span className="feature-value">Up to 15</span>
              </div>
            </div>
          </div>

          {/* Standard Plan */}
          <div className={`plan-card ${currentPlan === 'standard' ? 'plan-active' : 'plan-inactive'}`}>
            <div className="plan-header">
              {currentPlan === 'standard' && <span className="plan-check">✓</span>}
              <div className="plan-name">Standard</div>
              <div className="plan-desc">Enhanced Practice</div>
            </div>
            <div className="plan-price">$19/mo</div>
            <div className="plan-features">
              <div className="feature-item">
                <span className="feature-label">Dictation Hours</span>
                <span className="feature-value">15 hours/month</span>
              </div>
              <div className="feature-item">
                <span className="feature-label">Note Edits</span>
                <span className="feature-value">Unlimited</span>
              </div>
            </div>
          </div>

          {/* Professional Plan */}
          <div className={`plan-card ${currentPlan === 'pro' ? 'plan-active' : 'plan-inactive'}`}>
            <div className="plan-header">
              {currentPlan === 'pro' && <span className="plan-check">✓</span>}
              <div className="plan-name">Professional</div>
              <div className="plan-desc">Total Automation</div>
            </div>
            <div className="plan-price">$75/mo</div>
            <div className="plan-features">
              <div className="feature-item">
                <span className="feature-label">Dictation Hours</span>
                <span className="feature-value">Unlimited</span>
              </div>
              <div className="feature-item">
                <span className="feature-label">Note Edits</span>
                <span className="feature-value">Unlimited</span>
              </div>
            </div>
          </div>
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
          <div className="counters-container">
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
            
            {/* Smart Edits left counter - only visible for free tier users */}
            {currentPlan === 'free' && (
              <div className="notes-box">
                <span id="notes">{notesLeft < 0 ? '0' : notesLeft}</span>
                <span className="notes-label">Smart Edits left</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;
