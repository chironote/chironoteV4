import captureIcon from '../assets/conversation.svg';

// Updated ClipboardButtons component to use App's copy functionality -- using showCopyMessage from App.jsx
const ClipboardButtons = ({ 
  toggleRecordingPopup, 
  toggleDictationPopup, 
  showEditPanel, 
  toggleEditPanel, 
  setClipboardContent, 
  handleCopy,
  showCopyMessage 
}) => {
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
          className="toolbar-button"
          onClick={toggleDictationPopup}
        >
          <span className="material-symbols-rounded toolbar-icon">mic</span>
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
      `}</style>
    </div>
  );
};

export default ClipboardButtons;
