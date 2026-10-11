// Utility function to strip markdown formatting from text
// This ensures clean text is copied to clipboard without markdown syntax

export const stripMarkdown = (text) => {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove markdown headings (###, ##, #)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold (**text** or __text__)
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
  
  // Remove italic (*text* or _text_) - be careful not to affect underscores in words
  cleaned = cleaned.replace(/(\*|_)([^\*_]+)\1/g, '$2');
  
  // Remove strikethrough (~~text~~)
  cleaned = cleaned.replace(/~~(.*?)~~/g, '$1');
  
  // Remove inline code (`code`)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Remove code blocks (```code```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  
  // Remove links but keep the text [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Remove reference-style links [text][ref] -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\[[^\]]+\]/g, '$1');
  
  // Remove blockquote markers (> at start of line)
  cleaned = cleaned.replace(/^>\s+/gm, '');
  
  // Remove unordered list markers (*, -, +)
  cleaned = cleaned.replace(/^[\*\-\+]\s+/gm, '');
  
  // Remove ordered list markers (1., 2., etc.)
  cleaned = cleaned.replace(/^\d+\.\s+/gm, '');
  
  // Remove horizontal rules (---, ***, ___)
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');
  
  // Remove any remaining ** or __ that might have been missed
  cleaned = cleaned.replace(/[\*_]{1,2}/g, '');
  
  return cleaned.trim();
};
