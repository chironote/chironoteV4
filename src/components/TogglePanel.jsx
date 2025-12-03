const TogglePanel = ({ showNotes, setShowNotes }) => {
  const sliderStyle = {
    transform: showNotes ? 'translateX(0)' : 'translateX(100%)'
  };

  return (
    <div className="toggle-container">
      {/* Toggle between Notes and Transcripts */}
      <div className="toggle-option-wrapper">
        {!showNotes && <span className="switch-to-label">Switch to</span>}
        <span
          className={`toggle-option ${showNotes ? 'active' : ''}`}
          onClick={() => setShowNotes(true)}
        >
          <span className="material-symbols-rounded">description</span>
          Notes
        </span>
      </div>
      <div className="toggle-option-wrapper">
        {showNotes && <span className="switch-to-label">Switch to</span>}
        <span
          className={`toggle-option ${!showNotes ? 'active' : ''}`}
          onClick={() => setShowNotes(false)}
        >
          <span className="material-symbols-rounded">record_voice_over</span>
          Transcripts
        </span>
      </div>

      {/* Hidden checkbox to control the toggle state */}
      <input
        type="checkbox"
        onChange={() => setShowNotes(prev => !prev)}
        checked={!showNotes}
        style={{ display: 'none' }}
      />

      {/* Slider for visual toggle indication with dynamic style */}
      <span className="slider" style={sliderStyle}></span>
    </div>
  );
}

export default TogglePanel;