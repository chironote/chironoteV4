import React, { useState } from 'react';
import menuIcon from '../assets/menu.svg'; // Assuming menuIcon is still used elsewhere or can be removed if not.
import './ContentPopup.css'; // Import component-specific styles

// Helper function to format timestamp for display in popup
const formatPopupDate = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(Number(timestamp));
  
  const time = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
  
  const day = date.toLocaleString('en-US', {
    weekday: 'short'
  });
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayNum = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `     ${time} ${day} ${month}/${dayNum}/${year}`;
};

const ContentPopup = ({ 
  setShowContentPopup, 
  setShowPopupMenu, // Retained as it's part of the original signature
  showNotes, 
  // showPopupMenu, // Not directly used by the new logic but retained
  // togglePopupMenu, // Not directly used by the new logic but retained
  handleCopy, // For the main copy button
  // handleSendToClipboard, // Not directly used by the new logic but retained
  selectedContent, 
  showPopupCopyMessage, // For the main copy button feedback
  timestamp
}) => {
  const [copiedSectionHeader, setCopiedSectionHeader] = useState(''); // e.g., "Subjective:" or "Subjective: Copied!"

  const handleSectionCopy = async (header, textToCopy) => {
    const sectionName = header.slice(0, -1); // Remove trailing colon for messages
    if (!textToCopy || !textToCopy.trim()) {
      setCopiedSectionHeader(`${sectionName}_empty`);
      setTimeout(() => setCopiedSectionHeader(''), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedSectionHeader(`${sectionName}_copied`);
    } catch (err) {
      console.error('Failed to copy section text: ', err);
      setCopiedSectionHeader(`${sectionName}_failed`);
    }
    setTimeout(() => setCopiedSectionHeader(''), 2000); // Hide message after 2 seconds
  };

  const renderProcessedContent = () => {
    if (!selectedContent || typeof selectedContent !== 'string') {
      return 'No content available';
    }

    const headers = ["Subjective:", "Objective:", "Assessment:", "Plan:"];
    // Escape headers for regex, though not strictly needed for these specific strings
    const headerRegex = new RegExp(`(${headers.map(h => h.replace(/[.*+?^${}()|\[\]]/g, '\\\\$&')).join('|')})`, 'g');

    const matches = [];
    let match;
    while ((match = headerRegex.exec(selectedContent)) !== null) {
      matches.push({ header: match[0], index: match.index });
    }

    if (matches.length === 0) {
      return <span style={{ whiteSpace: 'pre-wrap' }}>{selectedContent}</span>;
    }

    const parts = [];
    let lastIndex = 0;

    if (matches[0].index > 0) {
      parts.push(
        <span key="initial-text" style={{ whiteSpace: 'pre-wrap' }}>
          {selectedContent.substring(0, matches[0].index)}
        </span>
      );
      lastIndex = matches[0].index;
    }

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];

      const sectionHeader = currentMatch.header;
      const sectionTextStartIndex = currentMatch.index + sectionHeader.length;
      const sectionTextEndIndex = nextMatch ? nextMatch.index : selectedContent.length;
      
      const sectionText = selectedContent.substring(sectionTextStartIndex, sectionTextEndIndex);
      const sectionName = sectionHeader.slice(0, -1); // For feedback key and messages

      parts.push(
        <React.Fragment key={`${sectionHeader}-${i}`}>
          <strong
            className="clickable-header"
            onClick={() => handleSectionCopy(sectionHeader, sectionText.trim())} // Trim text for copying
            title={`Copy ${sectionName} section`}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleSectionCopy(sectionHeader, sectionText.trim())}
          >
            {sectionHeader}
          </strong>
          {copiedSectionHeader === `${sectionName}_copied` && (
            <span className="section-copy-feedback success">
              {sectionName} section copied!
            </span>
          )}
          {copiedSectionHeader === `${sectionName}_empty` && (
            <span className="section-copy-feedback warning">
              {sectionName} section is empty.
            </span>
          )}
          {copiedSectionHeader === `${sectionName}_failed` && (
            <span className="section-copy-feedback error">
              Failed to copy {sectionName} section.
            </span>
          )}
          <span style={{ whiteSpace: 'pre-wrap' }}>{sectionText}</span>
        </React.Fragment>
      );
      lastIndex = sectionTextEndIndex;
    }
    return parts;
  };

  return (
    <div
      className="content-popup"
      onClick={() => {
        setShowContentPopup(false);
        if (setShowPopupMenu) setShowPopupMenu(false); // Close menu popup if its setter is provided
      }}
    >
      <div className="content-popup-inner" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <div>
            <h2>
              {showNotes ? "Note" : "Transcript"}
            </h2>
            {timestamp && (
              <p className="popup-date">{formatPopupDate(timestamp)}</p>
            )}
          </div>
          <div className="popup-actions">
            <button
              className="popup-copy-button"
              onClick={() => handleCopy(true)} // Main copy button
              aria-label="Copy all content"
              title="Copy all content"
            >
              <span className="material-symbols-rounded">
                {showPopupCopyMessage ? 'check' : 'content_copy'}
              </span>
            </button>
            <button 
              className="popup-close-button"
              onClick={() => setShowContentPopup(false)}
              aria-label="Close"
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>

        <div className="content-popup-text">
          {renderProcessedContent()}
        </div>
        
      </div>
    </div>
  );
};

export default ContentPopup;