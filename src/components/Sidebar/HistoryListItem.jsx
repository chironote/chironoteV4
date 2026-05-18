import React from 'react';
import { formatTimestamp, getFirstSentenceOrSubstring } from '../../utils/historyGrouping';

function HistoryListItem({ item, onClick, onDragStart, isNew, onMouseEnter }) {
  const content = item.note || '';
  const displayText = item.noteLabel || getFirstSentenceOrSubstring(content);
  const { day, time } = formatTimestamp(item.timestamp);

  const handleDragStart = (event) => {
    event.dataTransfer.setData('text/plain', content);
    onDragStart(content);
  };

  return (
    <div
      className={`list-item ${isNew ? 'highlight' : ''}`}
      onClick={() => onClick(item)}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={onMouseEnter}
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <div className="timestamp">
        <span className="day">{day}</span>
        <span className="time">{time}</span>
      </div>
      <div className="content">{displayText}</div>
    </div>
  );
}

export default HistoryListItem;
