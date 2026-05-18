import { stripMarkdown } from './markdownStripper';

export const extractPlainText = (html) => {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  const plainText = tempElement.textContent?.trim() || '';

  return stripMarkdown(plainText);
};

export const getFirstSentenceOrSubstring = (text, maxLength = 89) => {
  if (!text) return 'Empty';

  if (text.length <= maxLength) return text;

  const substring = text.substring(0, maxLength);
  const lastSpaceIndex = substring.lastIndexOf(' ');

  if (lastSpaceIndex === -1) return substring + '...';

  return substring.substring(0, lastSpaceIndex) + '...';
};

export const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));

  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const formatTimestamp = (timestamp) => {
  const numTimestamp = Number(timestamp);
  const date = new Date(numTimestamp);
  const weekStart = getWeekStartDate(date);

  return {
    day: date.toLocaleString(undefined, { weekday: 'short' }),
    time: date.toLocaleString(undefined, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }),
    weekStart: weekStart.getTime(),
    weekLabel: weekStart.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })
  };
};

export const groupItemsByWeek = (items) => {
  const groupedItems = {};

  items.forEach(item => {
    const { weekStart, weekLabel } = formatTimestamp(item.timestamp);

    if (!groupedItems[weekStart]) {
      groupedItems[weekStart] = {
        weekStart,
        weekLabel,
        items: []
      };
    }

    groupedItems[weekStart].items.push(item);
  });

  return Object.values(groupedItems).sort((a, b) => b.weekStart - a.weekStart);
};
