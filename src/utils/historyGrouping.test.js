import { formatTimestamp } from './historyGrouping';

describe('formatTimestamp', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks timestamps from the current local calendar day', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 29, 14, 0));

    const result = formatTimestamp(new Date(2026, 7, 29, 9, 15).getTime());

    expect(result.isToday).toBe(true);
    expect(result.date).toBe(new Date(2026, 7, 29).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    }));
  });

  it('keeps a date label for an earlier local calendar day', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 7, 29, 14, 0));

    const result = formatTimestamp(new Date(2026, 7, 28, 23, 45).getTime());

    expect(result.isToday).toBe(false);
    expect(result.date).toBe(new Date(2026, 7, 28).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    }));
  });
});
