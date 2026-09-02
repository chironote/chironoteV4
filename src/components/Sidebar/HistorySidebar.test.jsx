import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import HistorySidebar from './HistorySidebar';

global.IS_REACT_ACT_ENVIRONMENT = true;

describe('HistorySidebar', () => {
  let container;
  let root;

  const renderSidebar = (props = {}) => {
    act(() => root.render(
      <HistorySidebar
        notes={[]}
        isCollapsed={false}
        isLoading={false}
        fetchError={null}
        collapsedWeeks={new Set()}
        newItems={new Set()}
        onItemClick={() => {}}
        onDragStart={() => {}}
        onRemoveHighlight={() => {}}
        onToggleWeek={() => {}}
        onRefresh={() => {}}
        {...props}
      />
    ));
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('refreshes recent notes through an accessible action', () => {
    const onRefresh = jest.fn();
    renderSidebar({ onRefresh });

    const button = container.querySelector('[aria-label="Refresh recent notes"]');
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(false);

    act(() => button.click());
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('reports refresh progress and errors without hiding current notes', () => {
    renderSidebar({
      isLoading: true,
      fetchError: 'Unable to refresh recent notes. Check your connection and try again.',
      notes: [{ timestamp: Date.now(), note: 'Kept note' }]
    });

    const button = container.querySelector('[aria-label="Refreshing recent notes"]');
    expect(button.disabled).toBe(true);
    expect(container.querySelector('[role="alert"]').textContent)
      .toBe('Unable to refresh recent notes. Check your connection and try again.');
    expect(container.textContent).toContain('Kept note');
  });
});
