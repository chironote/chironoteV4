import { diagnosisCodesForNote, normalizeDiagnosisCode } from './diagnosisCodes';

// Match the service's explicit Assessment token boundary. Never infer codes from prose.
const codePattern = /(?<![A-Z0-9.])[A-Z][0-9][A-Z0-9](?:\.[A-Z0-9]{1,4})?(?![A-Z0-9]|\.[A-Z0-9])/gi;
export function assessmentCodes(body) {
  let assessment = false;
  const entries = [];
  for (const line of String(body || '').split(/\r?\n/)) {
    const heading = line.match(/^\s*(?:#{1,6}\s*)?\*{0,2}(Subjective|Objective|Assessment|Treatment|Plan)\*{0,2}\s*:\*{0,2}\s*(.*)$/i);
    if (heading) assessment = heading[1].toLowerCase() === 'assessment';
    if (!assessment) continue;
    const text = heading ? heading[2] : line;
    for (const segment of text.split(';')) {
      const matches = [...segment.matchAll(codePattern)];
      for (const match of matches) {
        const code = match[0].toUpperCase();
        if (entries.some(entry => entry.code === code)) continue;
        const description = matches.length === 1 ? segment.replace(codePattern, '').replace(/[[\]*#]/g, '')
          .replace(/^\s*[-\d.)\s:–—]+/, '').replace(/[\s():–—-]+$/, '').trim() : '';
        entries.push({ code, description: description.slice(0, 200) });
      }
    }
  }
  return entries;
}

export function diagnosisReviewForDraft(note, draft) {
  // Re-exams retain server reconciliation and its signed confirmation flow.
  if (note.visitType === 'reExam' && !note.diagnosisReviewRequired) return null;
  const before = assessmentCodes(note.note);
  const after = assessmentCodes(draft);
  const key = entries => entries.map(item => item.code).sort().join('|');
  if (!note.diagnosisReviewRequired && key(before) === key(after)) return null;
  const prior = diagnosisCodesForNote(note) || [];
  const icdCodes = after.map(item => {
    const existing = prior.find(saved => normalizeDiagnosisCode(saved.code) === item.code);
    return { ...item, description: item.description || existing?.description || '', status: existing?.status || (note.visitType === 'initialExam' ? 'new' : '') };
  });
  return { icdCodes, removed: prior.filter(item => !after.some(entry => entry.code === normalizeDiagnosisCode(item.code))) };
}
