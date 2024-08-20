import React, { useState, useEffect } from 'react';
import './Account.css';
import { PLANS, getPlanFeatures } from '../../constants/constants';
import config from '../../amplifyconfiguration.json';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { createTodo, updateTodo, deleteTodo } from '../../graphql/mutations';
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

  useEffect(() => {
    fetchUserSubscription();
  }, []);
  
  async function fetchUserSubscription() {
    try {
      const userAttributes = await fetchUserAttributes();
      const owner = userAttributes.sub;
      console.log('User id:', owner);

      const data = await client.graphql({
        query: getUserSubscription,
        variables: { owner: owner }
      });
      const currentTier = data.data.getUserSubscription.tier.toLowerCase();
      console.log('Current Tier:', currentTier);
      
      setCurrentPlan(currentTier);
      setRemainingHours(data.data.getUserSubscription.remainingHours || 0);
    } catch (err) {
      console.error('Error fetching user subscription:', err);
    }
  }

  // Handle name input change
  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  // Update name (mock functionality)
  const handleUpdateName = () => {
    console.log('Name updated:', name);
    // In a real app, this would update the name in state or context
  };

  return (
    <div className="account-container">
      <h1>Account Information</h1>

      {/* Name change section */}
      <div className="account-info">
        <label htmlFor="change-name">Change Name:</label>
        <input
          type="text"
          id="change-name"
          name="change-name"
          placeholder="Enter new name"
          value={name}
          onChange={handleNameChange}
        />
        <button className="update-name-btn" onClick={handleUpdateName}>
          Update Name
        </button>
      </div>

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
        <button className="manage-plan-btn">Change Plan</button>

        {/* Hours remaining this month */}
        <div className="hours-remaining">
          <h3>Hours Remaining this month</h3>
          <div className="hours-box">
            <span id="hours">{remainingHours}</span>
            <span className="hours-label">Hrs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;