import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TogglePanel from './TogglePanel';

describe('TogglePanel history refresh', () => {
  const renderPanel = (props = {}) => {
    const defaults = {
      showNotes: true,
      setShowNotes: jest.fn(),
      onRefresh: jest.fn(),
      isRefreshing: false,
      refreshError: '',
    };

    return { ...defaults, ...props, ...render(<TogglePanel {...defaults} {...props} />) };
  };

  it('requests a history refresh from the visible control', () => {
    const onRefresh = jest.fn();
    renderPanel({ onRefresh });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh recent history' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('communicates refresh progress and failure accessibly', () => {
    renderPanel({
      isRefreshing: true,
      refreshError: 'Could not refresh recent history. Please try again.',
    });

    const button = screen.getByRole('button', { name: 'Refreshing…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Fetching the latest notes and transcripts.');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not refresh recent history. Please try again.');
  });
});
