import type { ID } from '~/models/Identifiers'
import type { Track, TrackMetadata } from '~/models/Track'

type MaybeTrack = Pick<
  TrackMetadata,
  'is_delete' | 'is_streamable' | 'owner_id'
> &
  Partial<Pick<Track, '_marked_deleted'>>

export const isTrackUnavailable = (
  track: MaybeTrack | null | undefined,
  currentUserId?: ID | null
) =>
  !!track &&
  track.is_streamable === false &&
  !track.is_delete &&
  !track._marked_deleted &&
  (currentUserId == null || track.owner_id !== currentUserId)
