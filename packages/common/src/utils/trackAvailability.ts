import type { Track, TrackMetadata } from '~/models/Track'

type MaybeTrack = Pick<TrackMetadata, 'is_delete' | 'is_streamable'> &
  Partial<Pick<Track, '_marked_deleted'>>

/**
 * Whether a track should be shown as no longer available.
 *
 * The API reports this via `is_streamable`, which it sets to false when the
 * track is deleted or its owner is no longer active - either because the
 * artist deactivated their own account or because the account was delisted by
 * the trusted notifier. Deleted tracks are excluded here because they have
 * their own, more specific "deleted by artist" treatment.
 *
 * The check is an explicit `=== false` on purpose: not every track source
 * populates `is_streamable`, and an absent field must not be read as
 * unavailable.
 */
export const isTrackUnavailable = (track: MaybeTrack | null | undefined) =>
  !!track &&
  track.is_streamable === false &&
  !track.is_delete &&
  !track._marked_deleted
