const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

// Small deterministic PRNG so a track always draws the same shape.
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * Fallback for tracks no content node has analyzed: a shape synthesized from
 * the track id, a slow section envelope with per-bar jitter. Values are 0-1.
 */
export const makeWaveformPeaks = (seed: number, count: number) => {
  const rand = mulberry32(seed)
  const peaks: number[] = []
  let envelope = 0.3
  for (let i = 0; i < count; i++) {
    if (rand() < 0.03) envelope = 0.2 + rand() * 0.75
    const jitter = 0.55 + rand() * 0.45
    const noise = (rand() - 0.5) * 0.12
    peaks.push(clamp(envelope * jitter + noise, 0.05, 1))
  }
  return peaks
}

/**
 * Fits a node's 0-255 buckets to the bar count, keeping each span's loudest.
 * Values are 0-1, scaled so the loudest bucket fills the height; a quiet
 * master would otherwise draw as a flat strip.
 */
export const resampleWaveformPeaks = (source: number[], count: number) => {
  const loudest = Math.max(1, ...source)
  const peaks: number[] = []
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * source.length) / count)
    const end = Math.max(
      start + 1,
      Math.floor(((i + 1) * source.length) / count)
    )
    let max = 0
    for (let j = start; j < end && j < source.length; j++) {
      max = Math.max(max, source[j])
    }
    peaks.push(max / loudest)
  }
  return peaks
}
