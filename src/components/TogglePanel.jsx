const TogglePanel = ({ showNotes, setShowNotes, onRefresh, isRefreshing, refreshError }) => {
  const sliderStyle = {
    transform: showNotes ? 'translateX(0)' : 'translateX(calc(100% + 4px))'
  };

  return (
    <>
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

        {/* Slider for visual toggle indication with dynamic style */}
        <span className="slider" style={sliderStyle}></span>
      </div>
      <div className="history-refresh">
        <button
          type="button"
          className="history-refresh-button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
        >
          <span className="material-symbols-rounded" aria-hidden="true">refresh</span>
          {isRefreshing ? 'Refreshing…' : 'Refresh recent history'}
        </button>
        <p className="history-refresh-status" role="status" aria-live="polite">
          {isRefreshing ? 'Fetching the latest notes and transcripts.' : ''}
        </p>
        {refreshError && <p className="history-refresh-error" role="alert">{refreshError}</p>}
      </div>
    </>
  );
}

export default TogglePanel;
