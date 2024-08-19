import React, { useState } from 'react';
import './Account.css';
import { PLANS, getPlanFeatures } from '../../constants/constants';

// Component to render individual subscription options
const SubscriptionOption = ({ plan, isActive, onClick }) => (
  <div
    className={`subscription-option ${isActive ? 'active' : ''}`}
    onClick={() => onClick(plan)}
  >
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
  const [currentPlan, setCurrentPlan] = useState('free');
  const [remainingHours, setRemainingHours] = useState(10);

  // Handle name input change
  const handleNameChange = (event) => {
    setName(event.target.value);
  };

  // Update name (mock functionality)
  const handleUpdateName = () => {
    console.log('Name updated:', name);
    // In a real app, this would update the name in state or context
  };

  // Handle plan selection
  const handlePlanSelect = (plan) => {
    setCurrentPlan(plan);
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
              isActive={currentPlan === plan}
              onClick={handlePlanSelect}
            />
          ))}
        </div>
        <button className="manage-plan-btn">Manage Plan</button>

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