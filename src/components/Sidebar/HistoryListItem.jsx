import React from 'react';
import PatientName from '../Patients/PatientName';
import { formatTimestamp, getFirstSentenceOrSubstring } from '../../utils/historyGrouping';
import { SAVED_NOTE_DRAG_TYPE } from '../../utils/savedNoteDrag';

function HistoryListItem({ item, onClick, onDragStart, isNew, onMouseEnter }) {
  const content = item.note || '';
  const displayText = item.visitLabel || item.noteLabel || getFirstSentenceOrSubstring(content);
  const { date, day, isToday, time } = formatTimestamp(item.timestamp);

  const handleDragStart = (event) => {
    event.dataTransfer.setData('text/plain', content);
    if (item.timestamp) event.dataTransfer.setData(SAVED_NOTE_DRAG_TYPE, String(item.timestamp));
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
        <PatientName patientId={item.patientId} /><div className="content">{displayText}</div>
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
