import React from 'react';
import { groupItemsByWeek } from '../../utils/historyGrouping';
import HistoryListItem from './HistoryListItem';

function HistorySidebar({
  notes,
  isCollapsed,
  isLoading,
  fetchError,
  collapsedWeeks,
  newItems,
  onItemClick,
  onDragStart,
  onRemoveHighlight,
  onToggleWeek,
  onRefresh
}) {
  const renderItems = () => {
    if (isLoading && notes.length === 0) {
      return <div className="loading-message">Loading recent history</div>;
    }

    if (notes.length === 0) {
      return (
        <div className="empty-list-message">
          Start recording to generate your first note
        </div>
      );
    }

    return groupItemsByWeek(notes).map(week => (
      <div key={week.weekStart} className="week-group">
        <button
          type="button"
          className="week-header"
          onClick={() => onToggleWeek(week.weekStart)}
          aria-expanded={!collapsedWeeks.has(week.weekStart)}
        >
          <span className="week-label">Week of {week.weekLabel}</span>
          <span className="material-symbols-rounded collapse-icon" aria-hidden="true">
            {collapsedWeeks.has(week.weekStart) ? 'keyboard_arrow_right' : 'keyboard_arrow_down'}
          </span>
        </button>

        <div className={`week-items ${collapsedWeeks.has(week.weekStart) ? 'collapsed' : ''}`}>
          {week.items.map(item => (
            <HistoryListItem
              key={item.timestamp}
              item={item}
              onClick={onItemClick}
              onDragStart={onDragStart}
              isNew={newItems.has(item.timestamp)}
              onMouseEnter={() => onRemoveHighlight(item.timestamp)}
            />
          ))}
        </div>
      </div>
    ));
  };

  return (
    <section
      className={`left-panel recent-notes-panel ${isCollapsed ? 'collapsed' : ''}`}
      aria-labelledby="recent-notes-title"
    >
      <div className="fade-content">
        <div className="recent-notes-header">
          <div>
            <h2 id="recent-notes-title" className="left-panel-title">Recent Notes</h2>
            <p className="recent-notes-subtitle">Your latest generated notes</p>
          </div>
          <div className="recent-notes-header-actions">
            {!isLoading && notes.length > 0 && (
              <span className="recent-notes-count" aria-label={`${notes.length} recent notes`}>
                {notes.length}
              </span>
            )}
            <button
              type="button"
              className="recent-notes-refresh"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label={isLoading ? 'Refreshing recent notes' : 'Refresh recent notes'}
            >
              <span className="material-symbols-rounded" aria-hidden="true">refresh</span>
              <span>{isLoading ? 'Refreshing' : 'Refresh'}</span>
            </button>
          </div>
        </div>
        {fetchError && <p className="recent-notes-error" role="alert">{fetchError}</p>}
        <div className="list-container">
          {renderItems()}
        </div>
      </div>
    </section>
  );
}

export default HistorySidebar;
