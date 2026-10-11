import { isValidDiagnosisCode, replaceExactDiagnosisCode } from './diagnosisCodes';

test('replaces every complete code token and preserves prose and longer neighboring codes', () => {
  const note = 'A M54.5 finding; M54.50 is distinct. Recheck M54.5.';
  const result = replaceExactDiagnosisCode(note, 'm54.5', 'm54.6');

  expect(result).toEqual({
    note: 'A M54.6 finding; M54.50 is distinct. Recheck M54.6.',
    replacementCount: 2,
    partialCount: 1,
  });
});

test('reports a code that appears only as a partial prefix without changing the note', () => {
  const note = 'The note contains M54.50 only.';
  expect(replaceExactDiagnosisCode(note, 'M54.5', 'M54.6')).toEqual({
    note,
    replacementCount: 0,
    partialCount: 1,
  });
});

test('accepts complete ICD code shapes and rejects partial or malformed values', () => {
  expect(isValidDiagnosisCode(' m54.50 ')).toBe(true);
  expect(isValidDiagnosisCode('S39.012A')).toBe(true);
  expect(isValidDiagnosisCode('M54.')).toBe(false);
  expect(isValidDiagnosisCode('54.5')).toBe(false);
  expect(isValidDiagnosisCode('M54.12345')).toBe(false);
});
