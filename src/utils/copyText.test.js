import { cleanCopyText, extractCopyText } from './copyText';
import { stripMarkdown } from './markdownStripper';

describe('copy text cleanup', () => {
  test('preserves lists, numbering, quotes, rules and literal punctuation', () => {
    const text = '- First\n+ Second\n* Third\n* Fourth\n1. Numbered\n2. Next\n> Quote\n---\n***\n___\n* * *\npatient_name_left * unmatched _';
    expect(cleanCopyText(text)).toBe(text);
  });

  test('removes paired formatting and heading markers, retaining their text', () => {
    expect(cleanCopyText('## Heading\n**bold** __bold__ *italic* _italic_ ~~old~~ `patient_name * literal`'))
      .toBe('Heading\nbold bold italic italic old patient_name * literal');
  });

  test('keeps list markers around formatted text and trims only outer whitespace', () => {
    expect(cleanCopyText('  \n- **First**\n* *Second*\n1. _Third_\n\n  indented text  \n  '))
      .toBe('- First\n* Second\n1. Third\n\n  indented text');
  });

  test('keeps visible link labels without destinations', () => {
    expect(cleanCopyText('[Exercises](https://example.com) and [Guidance][ref]'))
      .toBe('Exercises and Guidance');
  });

  test('retains HTML-to-text copying and the new marker policy', () => {
    expect(extractCopyText('<strong>Assessment:</strong> Improving\n- Continue\n&gt; Quote\n___'))
      .toBe('Assessment: Improving\n- Continue\n> Quote\n___');
  });

  test('keeps legacy generation cleanup and fenced-code behavior', () => {
    expect(stripMarkdown('- **First**')).toBe('First');
    const fenced = '```\nexample\n```';
    expect(cleanCopyText(fenced)).toBe(stripMarkdown(fenced));
  });

  test('handles empty input', () => {
    expect(cleanCopyText(null)).toBe('');
    expect(extractCopyText('')).toBe('');
  });
});
