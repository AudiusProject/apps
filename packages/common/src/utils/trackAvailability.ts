import type { ID } from '~/models/Identifiers'
import type { Track, TrackMetadata } from '~/models/Track'

type MaybeTrack = Pick<
  TrackMetadata,
  'is_delete' | 'is_streamable' | 'owner_id'
> &
  Partial<Pick<Track, '_marked_deleted'>>

/**
 * Whether a track should be shown as no longer available, i.e. the API marked
 * it non-streamable (e.g. its owner is no longer active). Deleted tracks are
 * excluded since they have their own treatment, and the owner can always see
 * their own track. Uses `=== false` because not every source sets
 * is_streamable.
 */
export const isTrackUnavailable = (
  track: MaybeTrack | null | undefined,
  currentUserId?: ID | null
) =>
  !!track &&
  track.is_streamable === false &&
  !track.is_delete &&
  !track._marked_deleted &&
  (currentUserId == null || track.owner_id !== currentUserId)
