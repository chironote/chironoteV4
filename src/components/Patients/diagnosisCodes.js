const ALPHANUMERIC = /[A-Za-z0-9]/;

function continuesCode(text, index) {
  const character = text[index];
  if (character && ALPHANUMERIC.test(character)) return true;
  return character === '.' && ALPHANUMERIC.test(text[index + 1] || '');
}

export const DIAGNOSIS_STATUSES = ['new', 'continuing', 'resolved'];

export function normalizeDiagnosisCode(value) {
  return String(value || '').trim().toUpperCase();
}

export function isValidDiagnosisCode(value) {
  return /^[A-Z][0-9][A-Z0-9](?:\.[A-Z0-9]{1,4})?$/.test(normalizeDiagnosisCode(value));
}

export function diagnosisStatusLabel(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'new') return 'New';
  if (value === 'continuing') return 'Continuing';
  if (value === 'resolved') return 'Resolved';
  return 'Status not recorded';
}

export function diagnosisCodesForNote(note) {
  let state = note?.diagnosisState;
  if (typeof state === 'string') {
    try { state = JSON.parse(state); } catch { state = null; }
  }
  if (!Array.isArray(state?.icdCodes)) return null;
  return state.icdCodes.map((item, index) => ({
    rowKey: index,
    code: String(item?.code || ''),
    description: String(item?.description || ''),
    status: String(item?.status || '').toLowerCase(),
    replacementCode: '',
    replacementDescription: String(item?.description || ''),
    replacementStatus: DIAGNOSIS_STATUSES.includes(String(item?.status || '').toLowerCase())
      ? String(item.status).toLowerCase() : '',
  }));
}

export function diagnosisCodesEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index];
    return normalizeDiagnosisCode(item.code) === normalizeDiagnosisCode(other.code)
      && String(item.description || '').trim() === String(other.description || '').trim()
      && String(item.status || '').toLowerCase() === String(other.status || '').toLowerCase();
  });
}

export function replaceExactDiagnosisCode(note, currentCode, replacementCode) {
  const source = String(note || '');
  const current = normalizeDiagnosisCode(currentCode);
  const replacement = normalizeDiagnosisCode(replacementCode);
  if (!current || !replacement || current === replacement) {
    return { note: source, replacementCount: 0, partialCount: 0 };
  }

  let output = '';
  let copiedThrough = 0;
  let replacementCount = 0;
  let partialCount = 0;
  for (let index = 0; index <= source.length - current.length; index += 1) {
    if (source.slice(index, index + current.length).toUpperCase() !== current) continue;
    const before = index === 0 || !ALPHANUMERIC.test(source[index - 1]);
    const afterIndex = index + current.length;
    const after = afterIndex === source.length || !continuesCode(source, afterIndex);
    if (before && after) {
      output += source.slice(copiedThrough, index) + replacement;
      copiedThrough = afterIndex;
      replacementCount += 1;
      index = afterIndex - 1;
    } else {
      partialCount += 1;
    }
  }
  if (!replacementCount) return { note: source, replacementCount, partialCount };
  output += source.slice(copiedThrough);
  return { note: output, replacementCount, partialCount };
}
