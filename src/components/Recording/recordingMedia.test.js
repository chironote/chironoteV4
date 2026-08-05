import { getRecordingMediaDescriptor } from './recordingMedia';

describe('recording media descriptors', () => {
  test('uses MP4 extension and audio metadata for Safari MP4 blobs', () => {
    expect(getRecordingMediaDescriptor('video/mp4', 'video/mp4')).toEqual({
      contentType: 'video/mp4',
      extension: 'mp4'
    });
  });

  test('preserves supported audio container types', () => {
    expect(getRecordingMediaDescriptor('audio/ogg')).toEqual({
      contentType: 'audio/ogg',
      extension: 'ogg'
    });
    expect(getRecordingMediaDescriptor('audio/wav')).toEqual({
      contentType: 'audio/wav',
      extension: 'wav'
    });
  });

  test('falls back to WebM when the browser omits a blob type', () => {
    expect(getRecordingMediaDescriptor('', '')).toEqual({
      contentType: 'audio/webm',
      extension: 'webm'
    });
  });
});
