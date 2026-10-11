import React from 'react';

function DictationPopup({
  isLoading,
  isTranscribing,
  onClose,
  onToggleDictation
}) {
  return (
    <div className="create-note-popup" onClick={onClose}>
      <div className="popup-content" onClick={(event) => event.stopPropagation()}>
        <h2>Dictation</h2>
        <p>Click the button below to start or stop dictation.</p>
        <button
          className={`dictation-button ${isTranscribing ? 'recording' : ''}`}
          onClick={onToggleDictation}
          disabled={isLoading}
        >
          {isLoading ? 'Initializing...' : isTranscribing ? 'Stop Dictation' : 'Start Dictation'}
        </button>
      </div>
    </div>
  );
}

export default DictationPopup;
