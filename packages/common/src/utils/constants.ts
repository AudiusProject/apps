export const MAX_PROFILE_RELATED_ARTISTS = 5

export const MESSAGE_GROUP_THRESHOLD_MINUTES = 2

// Minimum time spent buffering until we show visual indicators (loading spinners, etc)
// Intended to avoid flickering buffer states and avoid showing anything at all if the buffer is short & barely noticeable
export const MIN_BUFFERING_DELAY_MS = 1000

// Maximum time to wait for an audio request to start loading before trying next mirror (base, backs off on retries)
export const AUDIO_LOAD_TIMEOUT_MS = 2000
export const AUDIO_LOAD_TIMEOUT_BACKOFF_MULTIPLIER = 1.5
export const AUDIO_LOAD_TIMEOUT_MAX_MS = 30000

/**
 * Returns timeout in ms for audio load attempts, with exponential backoff on retries.
 */
export const getAudioLoadTimeoutMs = (retries: number): number =>
  Math.min(
    AUDIO_LOAD_TIMEOUT_MS *
      Math.pow(AUDIO_LOAD_TIMEOUT_BACKOFF_MULTIPLIER, retries),
    AUDIO_LOAD_TIMEOUT_MAX_MS
  )

export const TEMPORARY_PASSWORD = 'TemporaryPassword'

export const AUDIO_MATCHING_REWARDS_MULTIPLIER = 1
