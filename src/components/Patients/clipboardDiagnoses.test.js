import { assessmentCodes, diagnosisReviewForDraft } from './clipboardDiagnoses';

test('reads exact codes only from Assessment, deduplicates, and never invents a code from prose', () => {
  expect(assessmentCodes('Subjective: M99.01\n**Assessment:**\nCervical dysfunction without a code.\n- M54.2 — Cervicalgia\nM54.2\nPlan: M99.02')).toEqual([{ code: 'M54.2', description: 'Cervicalgia' }]);
  expect(assessmentCodes('Assessment: XM99.01 M99.010123 M99.01.2')).toEqual([]);
});
test.each(['initialExam', 'followUp', 'reExam'])('%s code changes use internal statuses without a status choice', visitType => {
  const note = { visitType: 'followUp', note: 'Assessment: M54.2 Cervicalgia', diagnosisState: { icdCodes: [{ code: 'M54.2', description: 'Cervicalgia', status: 'continuing' }] } };
  const review = diagnosisReviewForDraft({ ...note, visitType }, 'Assessment: M54.2 Cervicalgia\nM99.01 Cervical dysfunction');
  expect(review.icdCodes.map(item => item.status)).toEqual(['continuing', 'new']);
});
test('removals are explicit and an existing review flag can be resolved without changing body again', () => {
  const note = { visitType: 'initialExam', note: 'Assessment: M54.2 Cervicalgia', diagnosisState: { icdCodes: [{ code: 'M54.2', description: 'Cervicalgia', status: 'new' }] } };
  expect(diagnosisReviewForDraft(note, 'Assessment: No coded diagnoses.')).toMatchObject({ icdCodes: [], removed: [{ code: 'M54.2' }] });
  expect(diagnosisReviewForDraft({ ...note, diagnosisReviewRequired: true }, note.note).icdCodes).toHaveLength(1);
});
test('separates semicolon entries and leaves ambiguous multi-code descriptions for clinician input', () => {
  expect(assessmentCodes('Assessment: M99.01 Segmental dysfunction; M54.2 Cervicalgia')).toEqual([
    { code: 'M99.01', description: 'Segmental dysfunction' }, { code: 'M54.2', description: 'Cervicalgia' },
  ]);
  expect(assessmentCodes('Assessment: M99.01 M54.2 combined prose').map(item => item.description)).toEqual(['', '']);
});

test('resolved history stays internal until its code is explicitly restored to the note', () => {
  const note = { visitType: 'followUp', note: 'Assessment: M99.01 Cervical dysfunction', diagnosisState: { icdCodes: [
    { code: 'M54.2', description: 'Cervicalgia', status: 'resolved' },
    { code: 'M99.01', description: 'Cervical dysfunction', status: 'continuing' },
  ] } };
  const review = diagnosisReviewForDraft(note, note.note + '\nM99.02 Thoracic dysfunction');
  expect(review.icdCodes).toContainEqual({ code: 'M54.2', description: 'Cervicalgia', status: 'resolved' });
  expect(review.removed).toEqual([]);
  const restored = diagnosisReviewForDraft(note, note.note + '\nM54.2 Cervicalgia');
  expect(restored.icdCodes.find(item => item.code === 'M54.2').status).toBe('continuing');
});
