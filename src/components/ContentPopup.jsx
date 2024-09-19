import React from 'react';
import menuIcon from '../assets/menu.svg';

const ContentPopup = ({ 
  setShowContentPopup, 
  setShowPopupMenu, 
  showNotes, 
  showPopupMenu, 
  togglePopupMenu, 
  handleCopy, 
  handleSendToClipboard, 
  selectedContent, 
  showPopupCopyMessage 
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
            {showNotes ? (
              <>
                <span className="material-symbols-rounded">description</span> Note
              </>
            ) : (
              <>
                <span className="material-symbols-rounded">record_voice_over</span> Transcript
              </>
            )}
          </h2>
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