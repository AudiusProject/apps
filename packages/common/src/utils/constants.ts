export const MAX_PROFILE_TOP_SUPPORTERS = 5
export const MAX_PROFILE_RELATED_ARTISTS = 5
export const MAX_PROFILE_SUPPORTING_TILES = 1
export const MAX_ARTIST_HOVER_TOP_SUPPORTING = 7
/** Default pagination size for first page of "supporting" lists. This
 * drives components like the top 3+view all tile list on mobile. We need at
 * least 9 (if there are more than 9) for those components to render consistently.
 */
export const SUPPORTING_PAGINATION_SIZE = 9

export const MESSAGE_GROUP_THRESHOLD_MINUTES = 2

// Minimum time spent buffering until we show visual indicators (loading spinners, etc)
// Intended to avoid flickering buffer states and avoid showing anything at all if the buffer is short & barely noticeable
export const MIN_BUFFERING_DELAY_MS = 1000
export const TEMPORARY_PASSWORD = 'TemporaryPassword'

export const AUDIO_MATCHING_REWARDS_MULTIPLIER = 1
