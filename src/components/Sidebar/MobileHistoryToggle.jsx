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
      <div
        className={`mobile-toggle-button ${isDisabled ? 'disabled' : ''}`}
        onClick={isDisabled ? undefined : onToggle}
      >
        {isCollapsed ? (
          <span className="material-symbols-rounded">sort</span>
        ) : (
          <span className="material-symbols-rounded">left_panel_close</span>
        )}
      </div>
    </>
  );
}

export default MobileHistoryToggle;
