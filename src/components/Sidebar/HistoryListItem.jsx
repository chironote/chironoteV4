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

  return (
    <button
      type="button"
      className={`list-item ${isNew ? 'highlight' : ''}`}
      onClick={() => onClick(item)}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={onMouseEnter}
    >
      <div className="history-item-body">
        <div className="content">{displayText}</div>
        <div className="timestamp">
          <span>{time}</span>
          <span className="timestamp-separator" aria-hidden="true" />
          {isToday ? (
            <span className="timestamp-today">Today</span>
          ) : (
            <>
              <span>{day}</span>
              <span className="timestamp-separator" aria-hidden="true" />
              <span>{date}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export default HistoryListItem;
