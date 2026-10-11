const clampSelectionIndex = (index, textLength, fallback) => {
  const resolvedIndex = Number.isFinite(index) ? index : fallback;
  return Math.max(0, Math.min(resolvedIndex, textLength));
};

export const createDictationInsertion = (text, selectionStart, selectionEnd) => {
  const currentText = typeof text === 'string' ? text : '';
  const start = clampSelectionIndex(selectionStart, currentText.length, currentText.length);
  const end = Math.max(
    start,
    clampSelectionIndex(selectionEnd, currentText.length, start)
  );

  return {
    start,
    before: currentText.slice(0, start),
    after: currentText.slice(end)
  };
};

export const applyDictationText = (insertion, dictatedText) => {
  const before = insertion?.before || '';
  const after = insertion?.after || '';
  const transcript = typeof dictatedText === 'string' ? dictatedText : '';

  return {
    text: `${before}${transcript}${after}`,
    cursor: before.length + transcript.length
  };
};
