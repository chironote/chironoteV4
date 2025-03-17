import React, { useState, useEffect } from 'react';
import captureIcon from '../assets/conversation.svg';
import { trackDictationStart } from '../utils/analytics';

// Updated ClipboardButtons component with clearer state styling
const ClipboardButtons = ({ 
  toggleRecordingPopup, 
  toggleDictationPopup, 
  showEditPanel, 
  toggleEditPanel, 
  setClipboardContent, 
  handleCopy,
  showCopyMessage,
  isDictationLoading,
  isTranscribing,
  startDictation,
  dictationButtonStatus,
  dictationReady,
  isWebSocketConnecting
}) => {
  const [isDictationActive, setIsDictationActive] = useState(false);

  // Update the dictation active state based on props
  useEffect(() => {
    setIsDictationActive(isDictationLoading || isTranscribing || isWebSocketConnecting);
  }, [isDictationLoading, isTranscribing, isWebSocketConnecting]);

  const handleDictationClick = () => {
    // Track the dictation button click
    trackDictationStart();
    
    // Always call startDictation - the component will handle queuing if needed
    startDictation();
  };

  return (
    <div className="clipboard-toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-button new-note-button"
          onClick={() => toggleRecordingPopup('conversation')}
        >
          <span className="plus-icon">+</span>
          <span className="button-text">New Note</span>
        </button>

        <div className="toolbar-divider"></div>

        <button
          className={`toolbar-button 
            ${isDictationLoading || isWebSocketConnecting ? 'button-loading' : ''} 
            ${isTranscribing ? 'button-recording' : ''}`
          }
          onClick={handleDictationClick}
          // Remove the disabled attribute to allow clicks during loading
        >
          <span className="material-symbols-rounded toolbar-icon">mic</span>
          {isTranscribing && <span className="recording-indicator"></span>}
        </button>

        <div className="toolbar-divider"></div>

        <div className="toolbar-button-wrapper" style={{ position: 'relative' }}>
          <button
            className="toolbar-button"
            onClick={() => handleCopy(false)}
            title="Copy text"
          >
            <span className="material-symbols-rounded toolbar-icon">
              {showCopyMessage ? 'check' : 'content_copy'}
            </span>
          </button>
          {showCopyMessage && (
            <span className="copy-message" style={{ position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)' }}>Content copied to clipboard</span>
          )}
        </div>

        <div className="toolbar-divider"></div>

        <button
          className="toolbar-button"
          onClick={() => setClipboardContent("")}
          title="Clear text"
        >
          <span className="material-symbols-rounded toolbar-icon">delete</span>
        </button>

        <div className="toolbar-divider hide-on-mobile"></div>
        
        <button
          className={`toolbar-button ${showEditPanel ? 'active' : ''}`}
          onClick={toggleEditPanel}
        >
          <span className="material-symbols-rounded toolbar-icon hide-on-mobile">edit</span>
        </button>
        
      </div>
      {/* Added media query to hide elements on mobile */}
      <style jsx>{`
        @media only screen and (max-width: 768px) {
          .hide-on-mobile {
            display: none;
          }
        }

        /* Pulsating animation for dictation button - darker */
        .button-loading {
          animation: pulse 1.5s infinite;
          background-color: #dcdcdc !important;
          pointer-events: none;
        }

        /* Recording state - green highlight */
        .button-recording {
          background-color: #2e6930 !important;
          color: white !important;
          position: relative;
        }

        /* Recording indicator - red dot */
        .recording-indicator {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 8px;
          height: 8px;
          background-color: #ff3b30;
          border-radius: 50%;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }

        @keyframes pulse {
          0% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};

export default ClipboardButtons;
