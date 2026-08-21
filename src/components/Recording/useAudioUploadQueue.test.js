import { getNextUploadItem } from './useAudioUploadQueue';

describe('audio upload ordering', () => {
  const chunk = (name) => ({ audioBlob: new Blob(), filePath: `protected/user/${name}` });

  it('keeps all pending regular chunks ahead of the final chunk', () => {
    const firstRegular = chunk('recording_chunk_0.webm');
    const finalChunk = chunk('recording_final_1.webm');
    const laterRegular = chunk('recording_chunk_2.webm');

    expect(getNextUploadItem([firstRegular, finalChunk, laterRegular])).toBe(firstRegular);
    expect(getNextUploadItem([finalChunk, laterRegular])).toBe(laterRegular);
    expect(getNextUploadItem([finalChunk])).toBe(finalChunk);
  });
});
