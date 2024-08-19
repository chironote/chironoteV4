import captureIcon from '../assets/conversation.svg';
import dictateIcon from '../assets/mic.svg';
import smartEditIcon from '../assets/edit.png';

const ClipboardButtons = ({ toggleRecordingPopup, showEditPanel, toggleEditPanel }) => {
  return (
    <div className="clipboard-actions">
      {/* Start a new conversation */}
      <button
        className="action-button"
        onClick={() => toggleRecordingPopup('conversation')}
      >
        <img src={captureIcon} alt="Capture" className="button-icon" />
        New Conversation
      </button>

      {/* Start a new dictation */}
      <button
        className="action-button"
        onClick={() => toggleRecordingPopup('dictation_recording')}
      >
        <img src={dictateIcon} alt="Dictate" className="button-icon" />
        New Dictation
      </button>

      {/* Toggle smart edit panel */}
      <button
        className={`action-button ${showEditPanel ? 'active' : ''}`}
        onClick={toggleEditPanel}
      >
        <img src={smartEditIcon} alt="Smart Edit" className="button-icon" />
        Smart Edit
      </button>
    </div>
  )
}

export default ClipboardButtons;