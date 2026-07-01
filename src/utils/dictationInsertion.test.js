import { applyDictationText, createDictationInsertion } from './dictationInsertion';

describe('dictation insertion', () => {
  test('inserts a transcript at the cursor without overwriting following text', () => {
    const insertion = createDictationInsertion('Patient reports pain today.', 16, 16);

    expect(applyDictationText(insertion, 'lower back ')).toEqual({
      text: 'Patient reports lower back pain today.',
      cursor: 27
    });
  });

  test('replaces only the prior live transcript as partial results grow', () => {
    const insertion = createDictationInsertion('Plan: Follow up Friday.', 6, 6);

    expect(applyDictationText(insertion, 'Rest. ').text)
      .toBe('Plan: Rest. Follow up Friday.');
    expect(applyDictationText(insertion, 'Rest. Use ice. ').text)
      .toBe('Plan: Rest. Use ice. Follow up Friday.');
  });

  test('does not jump to matching text elsewhere in the note', () => {
    const insertion = createDictationInsertion('Pain improved. Plan: reassess.', 21, 21);

    expect(applyDictationText(insertion, 'Pain is mild; ').text)
      .toBe('Pain improved. Plan: Pain is mild; reassess.');
  });

  test('replaces an intentional selection and preserves everything around it', () => {
    const insertion = createDictationInsertion('Take two tablets daily.', 5, 16);

    expect(applyDictationText(insertion, 'one capsule').text)
      .toBe('Take one capsule daily.');
  });

  test('falls back to the end of the text when no selection is available', () => {
    const insertion = createDictationInsertion('Assessment: stable.', undefined, undefined);

    expect(applyDictationText(insertion, ' Continue care.')).toEqual({
      text: 'Assessment: stable. Continue care.',
      cursor: 34
    });
  });
});
