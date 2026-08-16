const DEFAULT_SAMPLE_INTERVAL_MS = 250;
const DEFAULT_SIGNAL_THRESHOLD = 0.01;

export const calculateSignalFrame = (samples) => {
  if (!samples?.length) {
    return { peak: 0, rms: 0 };
  }

  let peak = 0;
  let sumOfSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const magnitude = Math.abs(samples[index]);
    peak = Math.max(peak, magnitude);
    sumOfSquares += samples[index] * samples[index];
  }

  return {
    peak: Math.min(1, peak),
    rms: Math.min(1, Math.sqrt(sumOfSquares / samples.length))
  };
};

export const createSignalHealthAccumulator = ({
  signalThreshold = DEFAULT_SIGNAL_THRESHOLD
} = {}) => {
  let peak = 0;
  let rmsTotal = 0;
  let sampleCount = 0;
  let observedDurationMs = 0;
  let signalDurationMs = 0;

  return {
    addFrame(samples, durationMs = DEFAULT_SAMPLE_INTERVAL_MS) {
      const frame = calculateSignalFrame(samples);
      peak = Math.min(1, Math.max(peak, frame.peak));
      rmsTotal += frame.rms;
      sampleCount += 1;
      observedDurationMs += Math.max(0, durationMs);
      if (frame.rms >= signalThreshold) {
        signalDurationMs += Math.max(0, durationMs);
      }
      return frame;
    },

    getSummary() {
      return {
        observedDurationMs: Math.round(observedDurationMs),
        peak: Number(peak.toFixed(6)),
        rmsAverage: Number((sampleCount ? rmsTotal / sampleCount : 0).toFixed(6)),
        sampleCount,
        signalDurationMs: Math.round(signalDurationMs)
      };
    }
  };
};

const createNoopMonitor = () => ({
  pause: () => {},
  resume: () => {},
  stop: () => ({
    observedDurationMs: 0,
    peak: 0,
    rmsAverage: 0,
    sampleCount: 0,
    signalDurationMs: 0
  })
});

export const createSignalHealthMonitor = (stream, {
  AudioContextClass = typeof window !== 'undefined'
    ? (window.AudioContext || window.webkitAudioContext)
    : null,
  clearIntervalFn = clearInterval,
  now = () => Date.now(),
  sampleIntervalMs = DEFAULT_SAMPLE_INTERVAL_MS,
  setIntervalFn = setInterval
} = {}) => {
  if (!AudioContextClass || !stream) {
    return createNoopMonitor();
  }

  try {
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    const accumulator = createSignalHealthAccumulator();
    let isPaused = false;
    let isStopped = false;
    let lastSampleAt = now();

    analyser.fftSize = 2048;
    const frameBuffer = new Float32Array(analyser.fftSize);
    source.connect(analyser);
    if (audioContext.state === 'suspended') {
      Promise.resolve(audioContext.resume()).catch(() => {});
    }

    const intervalId = setIntervalFn(() => {
      const sampleAt = now();
      const sampleDurationMs = Math.max(0, sampleAt - lastSampleAt);
      lastSampleAt = sampleAt;
      if (isPaused || isStopped) {
        return;
      }
      analyser.getFloatTimeDomainData(frameBuffer);
      accumulator.addFrame(frameBuffer, sampleDurationMs || sampleIntervalMs);
    }, sampleIntervalMs);

    return {
      pause() {
        isPaused = true;
      },

      resume() {
        isPaused = false;
        lastSampleAt = now();
      },

      stop() {
        if (!isStopped) {
          isStopped = true;
          clearIntervalFn(intervalId);
          try {
            source.disconnect();
            analyser.disconnect();
          } catch (error) {
            // Audio nodes can already be disconnected during browser teardown.
          }
          Promise.resolve(audioContext.close()).catch(() => {});
        }
        return accumulator.getSummary();
      }
    };
  } catch (error) {
    return createNoopMonitor();
  }
};
