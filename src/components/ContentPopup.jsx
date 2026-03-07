import React, { useState } from 'react';
import { stripMarkdown } from '../utils/markdownStripper';
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
  setShowPopupMenu,
  showNotes, 
  showPopupMenu,
  togglePopupMenu,
  handleCopy, // For the main copy button
  selectedContent, 
  showPopupCopyMessage, // For the main copy button feedback
  timestamp,
  noteLabel, // Add noteLabel prop
  onLabelUpdate, // Add callback for label updates
  onViewModeChange,
  hasTranscript
}) => {
  const [copiedSectionHeader, setCopiedSectionHeader] = useState(''); // e.g., "Subjective:" or "Subjective: Copied!"
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editedLabel, setEditedLabel] = useState('');

  // Handle saving the edited label
  const handleSaveLabel = () => {
    const trimmedLabel = editedLabel.trim();
    if (trimmedLabel && trimmedLabel !== getDisplayLabel()) {
      onLabelUpdate(trimmedLabel);
    }
    setIsEditingLabel(false);
    setEditedLabel(''); // Clear the edit state
  };

  // Handle canceling the edit
  const handleCancelEdit = () => {
    setIsEditingLabel(false);
    setEditedLabel(''); // Clear the edit state
  };

  // Helper function to get the first sentence or a substring (same as in App.jsx)
  const getFirstSentenceOrSubstring = (text, maxLength = 89) => {
    if (!text) return 'Empty';
    
    if (text.length <= maxLength) return text;
    
    const substring = text.substring(0, maxLength);
    const lastSpaceIndex = substring.lastIndexOf(' ');
    
    if (lastSpaceIndex === -1) return substring + '...';
    
    return substring.substring(0, lastSpaceIndex) + '...';
  };

  // Get the display label with proper fallback logic
  const getDisplayLabel = () => {
    if (noteLabel) return noteLabel;
    return getFirstSentenceOrSubstring(selectedContent);
  };

  const handleSectionCopy = async (header, textToCopy) => {
    const sectionName = header.slice(0, -1); // Remove trailing colon for messages
    if (!textToCopy || !textToCopy.trim()) {
      setCopiedSectionHeader(`${sectionName}_empty`);
      setTimeout(() => setCopiedSectionHeader(''), 2000);
      return;
    }
    try {
      // Strip markdown formatting before copying
      const cleanedText = stripMarkdown(textToCopy);
      await navigator.clipboard.writeText(cleanedText);
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
    const headerRegex = new RegExp(`(${headers.map(h => h.replace(/[.*+?^${}()|\[\]]/g, '\\$&')).join('|')})`, 'g');

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

  const hasViewModeMenu = Boolean(hasTranscript) || !showNotes;

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
          <div className="popup-header-left">
            <div className="popup-header-top">
              <button
                className={`popup-edit-button ${isEditingLabel ? 'editing' : ''}`}
                onMouseDown={(e) => {
                  // Prevent blur from firing when clicking this button
                  if (isEditingLabel) {
                    e.preventDefault();
                  }
                }}
                onClick={() => {
                  if (isEditingLabel) {
                    handleSaveLabel();
                  } else {
                    setEditedLabel(getDisplayLabel());
                    setIsEditingLabel(true);
                  }
                }}
                aria-label={isEditingLabel ? "Save label" : "Edit label"}
                title={isEditingLabel ? "Save label (Enter)" : "Edit label"}
              >
                <span className="edit-button-text">
                  {isEditingLabel ? 'Save' : 'Rename'}
                </span>
              </button>
            </div>
            <div className="label-container">
              {isEditingLabel ? (
                <input
                  type="text"
                  value={editedLabel}
                  onChange={(e) => setEditedLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveLabel();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  onBlur={handleSaveLabel} // Always use the same save logic
                  onFocus={(e) => e.target.select()}
                  autoFocus
                  className="label-edit-input"
                  placeholder="Enter a label..."
                />
              ) : (
                <h2 className="label-title">
                  {getDisplayLabel()}
                </h2>
              )}
            </div>
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
            {hasViewModeMenu && (
              <div className="popup-menu-container">
                <button
                  className="popup-menu-button"
                  onClick={(e) => {
                    if (togglePopupMenu) {
                      togglePopupMenu(e);
                    }
                  }}
                  aria-label="More options"
                  title="More options"
                >
                  <span className="material-symbols-rounded">more_vert</span>
                </button>

                {showPopupMenu && (
                  <div className="popup-menu" onClick={(e) => e.stopPropagation()}>
                    {showNotes && hasTranscript && (
                      <button
                        type="button"
                        onClick={() => onViewModeChange && onViewModeChange('transcript')}
                      >
                        View Transcript
                      </button>
                    )}
                    {!showNotes && (
                      <button
                        type="button"
                        onClick={() => onViewModeChange && onViewModeChange('note')}
                      >
                        View Note
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
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