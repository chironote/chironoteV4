import React, { useState, useEffect } from 'react';
import './Account.css';
import config from '../../amplifyconfiguration.json';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { getUserSubscription } from '../../graphql/queries';
import { Amplify } from 'aws-amplify';

Amplify.configure(config);

const client = generateClient();

function Account({ setCurrentPage }) {
  const [remainingHours, setRemainingHours] = useState(0);
  const [notesLeft, setNotesLeft] = useState(0);
  const [tier, setTier] = useState('free');
  const [isQueryLoading, setIsQueryLoading] = useState(true);

  useEffect(() => {
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
      const hoursLeft = data.data.getUserSubscription.hoursleft;
      const notesLeftValue = data.data.getUserSubscription.notesleft;
      const userTier = data.data.getUserSubscription.tier || 'free';
      
      setRemainingHours(hoursLeft || 0);
      setNotesLeft(notesLeftValue || 0);
      setTier(userTier.toLowerCase());
    } catch (err) {
      console.error('Error fetching user subscription:', err);
    } finally {
      setIsQueryLoading(false);
    }
  }


  return (
    <div className="account-container">
      {isQueryLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      <h1>Your Account</h1>

      {/* Usage Information */}
      <div className="usage-info">
        <h2>Usage Summary</h2>
        
        <div className="usage-container">
          {/* Dictation Hours - visible on Standard and Pro only */}
          {(tier === 'standard' || tier === 'professional' || tier === 'pro') && (
            <div className="usage-card">
              <div className="usage-header">
                <span className="material-symbols-rounded">schedule</span>
                <h3>Dictation Hours</h3>
              </div>
              <div className="usage-value">
                {(tier === 'professional' || tier === 'pro') ? (
                  <>
                    <span className="hours-number">∞</span>
                    <span className="hours-unit">unlimited</span>
                  </>
                ) : (
                  <>
                    <span className="hours-number">{remainingHours < 0 ? '0' : remainingHours.toFixed(1)}</span>
                    <span className="hours-unit">hours remaining</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Smart Edits - visible on Free tier only */}
          {tier === 'free' && (
            <div className="usage-card">
              <div className="usage-header">
                <span className="material-symbols-rounded">edit_note</span>
                <h3>Smart Edits</h3>
              </div>
              <div className="usage-value">
                <span className="notes-number">{notesLeft < 0 ? '0' : notesLeft}</span>
                <span className="notes-unit">edits remaining</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Policy Link */}
      <div className="privacy-link-container">
        <a 
          href="https://public-docs-and-agreements.s3.us-east-2.amazonaws.com/TermsAndConditions.html" 
          target="_blank" 
          rel="noopener noreferrer"
          className="privacy-link"
        >
          Privacy Policy & Terms of Service
        </a>
      </div>
    </div>
  );
}

export default Account;
