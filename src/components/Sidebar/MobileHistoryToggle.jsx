import React from 'react';

function MobileHistoryToggle({
  isCollapsed,
  isDragOver,
  isDisabled,
  overlayRef,
  onClose,
  onDragOver,
  onDragLeave,
  onDrop,
  onToggle
}) {
  return (
    <>
      <div
        ref={overlayRef}
        className={`mobile-toggle-overlay ${isDragOver ? 'drag-over' : ''}`}
        onClick={() => !isCollapsed && onClose()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      ></div>
      <button
        type="button"
        className={`mobile-toggle-button ${isDisabled ? 'disabled' : ''}`}
        onClick={onToggle}
        disabled={isDisabled}
        aria-label={isCollapsed ? 'Open recent notes' : 'Close recent notes'}
      >
        {isCollapsed ? (
          <span className="material-symbols-rounded">sort</span>
        ) : (
          <span className="material-symbols-rounded">left_panel_close</span>
        )}
      </button>
    </>
  );
}

export default MobileHistoryToggle;
