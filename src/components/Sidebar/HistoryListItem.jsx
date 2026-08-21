import React from 'react';
import { formatTimestamp, getFirstSentenceOrSubstring } from '../../utils/historyGrouping';

function HistoryListItem({ item, onClick, onDragStart, isNew, onMouseEnter }) {
  const content = item.note || '';
  const displayText = item.noteLabel || getFirstSentenceOrSubstring(content);
  const { date, day, isToday, time } = formatTimestamp(item.timestamp);

  const handleDragStart = (event) => {
    event.dataTransfer.setData('text/plain', content);
    onDragStart(content);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick(item);
    }
  };

  return (
    <div
      className={`list-item ${isNew ? 'highlight' : ''}`}
      onClick={() => onClick(item)}
      onKeyDown={handleKeyDown}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={onMouseEnter}
      role="button"
      tabIndex={0}
    >
      <div className="history-item-body">
        <div className="content">{displayText}</div>
        <div className="timestamp">
          <span>{time}</span>
          <span aria-hidden="true">|</span>
          {isToday ? (
            <span>Today</span>
          ) : (
            <>
              <span>{day}</span>
              <span aria-hidden="true">|</span>
              <span>{date}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryListItem;
