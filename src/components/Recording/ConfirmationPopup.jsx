import React from 'react';
import './Recording.css';

function ConfirmationPopup({ onConfirm, onCancel }) {
  return (
    <div className="confirmation-popup">
      <div className="confirmation-content">
        <h3>Discard Recording?</h3>
        <p>Are you sure you want to discard the current conversation?</p>
        <div className="confirmation-buttons">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="confirm-btn" onClick={onConfirm}>Discard</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationPopup;
