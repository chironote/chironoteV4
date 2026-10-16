import { stripMarkdown } from './markdownStripper';

// Copy cleanup is separate from the existing generated-note/display cleanup.
export const cleanCopyText = (text) => {
  if (!text) return '';

  // Preserve the existing fenced-code behavior; protect inline code contents.
  return text.split(/(```[\s\S]*?```)/g).map((block, index) => {
    if (index % 2) return stripMarkdown(block);
    return block.split('\n').map(line => {
      // A rule is punctuation, not an empty emphasis span.
      if (/^\s*(?:[-*_][ \t]*){3,}$/.test(line)) return line;
      return line.split(/(`[^`]+`)/g).map((part, partIndex) => {
        if (partIndex % 2) return part.slice(1, -1);
        return part
          .replace(/^#{1,6}[ \t]+/, '')
          .replace(/(\*\*|__)(?=\S)(.+?\S|\S)\1/g, '$2')
          .replace(/(^|[^\w*])\*(?=\S)([^*]*?\S|\S)\*(?!\*)/g, '$1$2')
          .replace(/(^|[^\w_])_(?=\S)([^_]*?\S|\S)_(?!\w)/g, '$1$2')
          .replace(/~~(.*?)~~/g, '$1')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/\[([^\]]+)\]\[[^\]]+\]/g, '$1');
      }).join('');
    }).join('\n');
  }).join('').trim();
};

export const extractCopyText = (html) => {
  const element = document.createElement('div');
  element.innerHTML = html || '';
  return cleanCopyText(element.textContent || '');
};
