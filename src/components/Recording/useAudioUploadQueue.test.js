import {
  getAudioObjectIdentity,
  getNextUploadItem
} from './useAudioUploadQueue';

describe('audio upload ordering', () => {
  const chunk = (name) => ({ audioBlob: new Blob(), filePath: `protected/user/${name}` });

  it('keeps every pending regular chunk ahead of the final chunk', () => {
    const firstRegular = chunk('recording_chunk_0.webm');
    const finalChunk = chunk('recording_final_1.webm');
    const laterRegular = chunk('recording_chunk_2.webm');

    expect(getNextUploadItem([firstRegular, finalChunk, laterRegular])).toBe(firstRegular);
    expect(getNextUploadItem([finalChunk, laterRegular])).toBe(laterRegular);
    expect(getNextUploadItem([finalChunk])).toBe(finalChunk);
  });

  it('sends stable recording and chunk identities to the backend', () => {
    expect(getAudioObjectIdentity(
      'protected/user/1787675528393_recording_final_1787675528393_hd49fhm_3.webm'
    )).toEqual({
      chunkId: '1787675528393_hd49fhm-3',
      chunkOrder: 3,
      recordingJobId: '1787675528393_hd49fhm'
    });
  });
});
