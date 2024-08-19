const TogglePanel = ({ showNotes, setShowNotes }) => {
  return (
    <div className="toggle-container">
      {/* Toggle between Notes and Transcripts */}
      <span
        className={`toggle-option ${showNotes ? 'active' : ''}`}
        onClick={() => setShowNotes(true)}
      >
        <span className="material-symbols-rounded">description</span>
        Notes
      </span>
      <span
        className={`toggle-option ${!showNotes ? 'active' : ''}`}
        onClick={() => setShowNotes(false)}
      >
        <span className="material-symbols-rounded">record_voice_over</span>
        Transcripts
      </span>

      {/* Hidden checkbox to control the toggle state */}
      <input
        type="checkbox"
        onChange={() => setShowNotes(prev => !prev)}
        checked={!showNotes}
        style={{ display: 'none' }}
      />

      {/* Slider for visual toggle indication */}
      <span className="slider"></span>
    </div>
  )
}

export default TogglePanel;