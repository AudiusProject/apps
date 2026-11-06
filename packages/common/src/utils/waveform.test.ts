import { describe, it, expect } from 'vitest'

import { makeWaveformPeaks, resampleWaveformPeaks } from './waveform'

describe('makeWaveformPeaks', () => {
  it('draws the same shape for the same track', () => {
    expect(makeWaveformPeaks(42, 80)).toEqual(makeWaveformPeaks(42, 80))
    expect(makeWaveformPeaks(42, 80)).not.toEqual(makeWaveformPeaks(43, 80))
  })

  it('keeps every bar within 0.05-1', () => {
    const peaks = makeWaveformPeaks(7, 200)
    expect(peaks).toHaveLength(200)
    for (const peak of peaks) {
      expect(peak).toBeGreaterThanOrEqual(0.05)
      expect(peak).toBeLessThanOrEqual(1)
    }
  })
})

describe('resampleWaveformPeaks', () => {
  it('keeps the loudest bucket in each span', () => {
    expect(resampleWaveformPeaks([10, 40, 20, 80], 2)).toEqual([0.5, 1])
  })

  it('scales a quiet master so its loudest bar fills the height', () => {
    const peaks = resampleWaveformPeaks([16, 32, 64, 32], 4)
    expect(Math.max(...peaks)).toBe(1)
    expect(peaks).toEqual([0.25, 0.5, 1, 0.5])
  })

  it('stretches fewer buckets than bars', () => {
    expect(resampleWaveformPeaks([100, 200], 4)).toEqual([0.5, 0.5, 1, 1])
  })

  it('handles silence without dividing by zero', () => {
    expect(resampleWaveformPeaks([0, 0, 0], 3)).toEqual([0, 0, 0])
  })
})
