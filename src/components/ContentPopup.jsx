import React from 'react';
import menuIcon from '../assets/menu.svg';

// Helper function to format timestamp for display in popup
const formatPopupDate = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(Number(timestamp));
  
  // Format: "8:00 AM Tue 06/19/2025"
  const time = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  
  const day = date.toLocaleString('en-US', {
    weekday: 'short'
  });
  
  // Format month/day/year as MM/DD/YYYY
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayNum = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `     ${time} ${day} ${month}/${dayNum}/${year}`;
};

const ContentPopup = ({ 
  setShowContentPopup, 
  setShowPopupMenu, 
  showNotes, 
  showPopupMenu, 
  togglePopupMenu, 
  handleCopy, 
  handleSendToClipboard, 
  selectedContent, 
  showPopupCopyMessage,
  timestamp
}) => {
  return (
    <div
      className="content-popup"
      onClick={() => {
        // Close popups on outside click
        setShowContentPopup(false);
        setShowPopupMenu(false);
      }}
    >
      <div className="content-popup-inner" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>
            {showNotes ? "Note" : "Transcript"}
            {timestamp && (
              <span className="popup-date">{formatPopupDate(timestamp)}</span>
            )}
          </h2>
          <div className="popup-actions">
            <div className="popup-menu-container">
              {/* Menu icon to toggle popup menu */}
              <img
                src={menuIcon}
                alt="Menu"
                className="popup-menu-icon"
                onClick={togglePopupMenu}
              />

              {/* Options for copying or sending content */}
              {showPopupMenu && (
                <div className="popup-menu">
                  <button onClick={() => handleCopy(true)}>Copy to Clipboard</button>
                  <button onClick={handleSendToClipboard}>Send to Dashboard</button>
                </div>
              )}
            </div>
            {/* Close button */}
            <button 
              className="popup-close-button"
              onClick={() => setShowContentPopup(false)}
              aria-label="Close"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>

        {/* Display selected content */}
        <div className="content-popup-text">
          {selectedContent && typeof selectedContent === 'string' 
            ? selectedContent
            : 'No content available'}
        </div>
        
        {showPopupCopyMessage && (
          <div className="popup-copy-message">Content copied to clipboard</div>
        )}
      </div>
    </div>
  );
};

export default ContentPopup;