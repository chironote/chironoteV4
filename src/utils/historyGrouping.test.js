import { formatTimestamp } from './historyGrouping';

describe('formatTimestamp', () => {
  it('identifies timestamps from the current local calendar day', () => {
    const today = new Date();
    today.setHours(9, 5, 0, 0);

    const formatted = formatTimestamp(today.getTime());

    expect(formatted.isToday).toBe(true);
    expect(formatted.time).toBeTruthy();
  });

  it('provides weekday and calendar date metadata for earlier days', () => {
    const earlier = new Date();
    earlier.setDate(earlier.getDate() - 2);

    const formatted = formatTimestamp(earlier.getTime());

    expect(formatted.isToday).toBe(false);
    expect(formatted.day).toBeTruthy();
    expect(formatted.date).toBeTruthy();
  });
});
