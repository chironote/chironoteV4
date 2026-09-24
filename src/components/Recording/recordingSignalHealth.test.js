import {
  calculateSignalFrame,
  createSignalHealthAccumulator
} from './recordingSignalHealth';

describe('recording signal health', () => {
  test('calculates aggregate RMS and peak without retaining audio', () => {
    const frame = calculateSignalFrame(new Float32Array([0.5, -0.5, 0, 0]));

    expect(frame.peak).toBeCloseTo(0.5);
    expect(frame.rms).toBeCloseTo(Math.sqrt(0.125));
  });

  test('clamps clipping input instead of losing the signal summary', () => {
    const frame = calculateSignalFrame(new Float32Array([1.5, -1.5]));
    const accumulator = createSignalHealthAccumulator();
    accumulator.addFrame(new Float32Array([1.5, -1.5]), 250);

    expect(frame).toEqual({ peak: 1, rms: 1 });
    expect(accumulator.getSummary()).toMatchObject({ peak: 1, rmsAverage: 1 });
  });

  test('summarizes observed and above-threshold signal duration', () => {
    const accumulator = createSignalHealthAccumulator({ signalThreshold: 0.1 });
    accumulator.addFrame(new Float32Array([0.2, -0.2]), 250);
    accumulator.addFrame(new Float32Array([0.01, -0.01]), 250);

    expect(accumulator.getSummary()).toEqual({
      observedDurationMs: 500,
      peak: 0.2,
      rmsAverage: 0.105,
      sampleCount: 2,
      signalDurationMs: 250
    });
  });
});
