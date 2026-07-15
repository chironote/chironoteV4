import React from 'react';
import { groupItemsByWeek } from '../../utils/historyGrouping';
import HistoryListItem from './HistoryListItem';

function HistorySidebar({
  notes,
  isCollapsed,
  isLoading,
  collapsedWeeks,
  newItems,
  onItemClick,
  onDragStart,
  onRemoveHighlight,
  onToggleWeek
}) {
  const renderItems = () => {
    if (isLoading) {
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
        <div
          className="week-header"
          onClick={() => onToggleWeek(week.weekStart)}
        >
          <span className="week-label">Week of {week.weekLabel}</span>
          <span className="collapse-icon">
            {collapsedWeeks.has(week.weekStart) ? '▶' : '▼'}
          </span>
        </div>

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
    <section className={`left-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="fade-content">
        <h2 className="panel-header left-panel-title">Recent Notes</h2>
        <div className="list-container">
          {renderItems()}
        </div>
      </div>
    </section>
  );
}

export default HistorySidebar;
