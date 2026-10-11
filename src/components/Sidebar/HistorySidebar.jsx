import React, { useState } from 'react';
import usePatientNames from '../Patients/usePatientNames';
import { patientNotesEnabled } from '../../services/patientNotes';
import { groupItemsByWeek } from '../../utils/historyGrouping';
import HistoryListItem from './HistoryListItem';

function HistorySidebar({
  notes,
  isCollapsed,
  isLoading,
  collapsedWeeks,
  newItems,
  onRefresh,
  refreshError,
  onItemClick,
  onDragStart,
  onRemoveHighlight,
  onToggleWeek
}) {
  const [search, setSearch] = useState('');
  const names = usePatientNames(notes);
  const terms = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const visibleNotes = terms.length ? notes.filter(note => terms.every(term => `${names[note.patientId] || ''} ${note.visitLabel || ''} ${note.noteLabel || ''} ${note.note || ''}`.toLocaleLowerCase().includes(term))) : notes;
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

    if (!visibleNotes.length) return <p>No matching recent notes.</p>;
    return groupItemsByWeek(visibleNotes).map(week => (
      <div key={week.weekStart} className="week-group">
        <button
          type="button"
          className="week-header"
          onClick={() => onToggleWeek(week.weekStart)}
          aria-expanded={(terms.length > 0 || !collapsedWeeks.has(week.weekStart))}
        >
          <span className="week-label">Week of {week.weekLabel}</span>
          <span className="material-symbols-rounded collapse-icon" aria-hidden="true">
            {collapsedWeeks.has(week.weekStart) ? 'keyboard_arrow_right' : 'keyboard_arrow_down'}
          </span>
        </button>

        <div className={`week-items ${!terms.length && collapsedWeeks.has(week.weekStart) ? 'collapsed' : ''}`}>
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
          <button
            type="button"
            className="recent-notes-refresh"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh recent notes"
            title="Refresh recent notes"
          >
            <span className="material-symbols-rounded" aria-hidden="true">refresh</span>
          </button>
        </div>
        {refreshError && <p role="alert">{refreshError}</p>}
        <div className="list-container">
          {patientNotesEnabled && <label className="patient-history-search">Search recent notes<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Patient, visit or note text" /></label>}
          {renderItems()}
        </div>
      </div>
    </section>
  );
}

export default HistorySidebar;
