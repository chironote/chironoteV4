import { createNoteGenerationStreamParser } from './noteGenerationErrors';

test.each(['NOTE_RECOVERED', 'CONFLICT'])('recognizes %s at every stream split without exposing control bytes', code => {
  const control = '\u0000ERROR:' + JSON.stringify({ code, message: 'Synthetic message with } and escaped " text' });
  for (let split = 0; split <= control.length; split++) {
    const parse = createNoteGenerationStreamParser();
    const first = parse('Synthetic preview' + control.slice(0, split));
    const second = parse(control.slice(split), true);
    expect(first.text + second.text).toBe('Synthetic preview');
    expect(first.error || second.error).toMatchObject({ code });
    if (split < control.length) expect(first.error).toBeNull();
  }
});
test.each(['\u0000', '\u0000ERR', '\u0000ERROR:{"code":"NOTE_REC', '\u0000OTHER:bad'])('truncated control fails closed at EOF: %j', control => {
  const parse = createNoteGenerationStreamParser();
  expect(parse('Synthetic preview' + control)).toEqual({ text: 'Synthetic preview', error: null });
  expect(parse('', true).error.code).toBe('STREAM_CONTROL_INVALID');
});
test('ordinary text streams unchanged and oversized controls fail closed', () => {
  const parse = createNoteGenerationStreamParser();
  expect(parse('Subjective:\nSynthetic')).toEqual({ text: 'Subjective:\nSynthetic', error: null });
  expect(parse('', true)).toEqual({ text: '', error: null });
  expect(createNoteGenerationStreamParser()('\u0000ERROR:' + 'x'.repeat(16384)).error.code).toBe('STREAM_CONTROL_INVALID');
});

test('valid oversized JSON cannot bypass the control size limit', () => {
  const result = createNoteGenerationStreamParser()('\u0000ERROR:' + JSON.stringify({ code: 'NOTE_RECOVERED', message: 'x'.repeat(20000) }));
  expect(result.error.code).toBe('STREAM_CONTROL_INVALID');
});
