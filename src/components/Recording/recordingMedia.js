const MEDIA_TYPES = {
  mp4: {
    extension: 'mp4'
  },
  ogg: {
    contentType: 'audio/ogg',
    extension: 'ogg'
  },
  wav: {
    contentType: 'audio/wav',
    extension: 'wav'
  },
  webm: {
    contentType: 'audio/webm',
    extension: 'webm'
  }
};

export const getRecordingMediaDescriptor = (blobType, recorderMimeType) => {
  const sourceType = (blobType || recorderMimeType || '').toLowerCase();

  if (sourceType.includes('mp4')) {
    return {
      ...MEDIA_TYPES.mp4,
      contentType: sourceType.startsWith('video/mp4')
        ? 'video/mp4'
        : 'audio/mp4'
    };
  }
  if (sourceType.includes('ogg')) {
    return MEDIA_TYPES.ogg;
  }
  if (sourceType.includes('wav')) {
    return MEDIA_TYPES.wav;
  }

  return MEDIA_TYPES.webm;
};
