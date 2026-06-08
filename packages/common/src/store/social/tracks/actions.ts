import { createCustomAction } from 'typesafe-actions'

import {
  RepostSource,
  FavoriteSource,
  ShareSource
} from '../../../models/Analytics'
import { ID } from '../../../models/Identifiers'

export const REPOST_TRACK = 'SOCIAL/REPOST_TRACK'
export const UNDO_REPOST_TRACK = 'SOCIAL/UNDO_REPOST_TRACK'
export const REPOST_FAILED = 'SOCIAL/TRACK_REPOST_FAILED'

export const SAVE_TRACK = 'SOCIAL/SAVE_TRACK'
export const SAVE_TRACK_SUCCEEDED = 'SOCIAL/SAVE_TRACK_SUCCEEDED'
export const SAVE_TRACK_FAILED = 'SOCIAL/SAVE_TRACK_FAILED'

export const UNSAVE_TRACK = 'SOCIAL/UNSAVE_TRACK'
export const UNSAVE_TRACK_SUCCEEDED = 'SOCIAL/UNSAVE_TRACK_SUCCEEDED'
export const UNSAVE_TRACK_FAILED = 'SOCIAL/UNSAVE_TRACK_FAILED'

export const SET_ARTIST_PICK = 'SOCIAL/SET_ARTIST_PICK'
export const UNSET_ARTIST_PICK = 'SOCIAL/UNSET_ARTIST_PICK'

export const RECORD_LISTEN = 'SOCIAL/RECORD_LISTEN'
export const DOWNLOAD_TRACK = 'SOCIAL/DOWNLOAD_TRACK'
export const CANCEL_DOWNLOAD = 'SOCIAL/CANCEL_DOWNLOAD'
export const DOWNLOAD_FINISHED = 'SOCIAL/DOWNLOAD_FINISHED'

export const SHARE_TRACK = 'SOCIAL/SHARE_TRACK'
export const SHARE_CONTEST = 'SOCIAL/SHARE_CONTEST'

export const repostTrack = createCustomAction(
  REPOST_TRACK,
  (trackId: ID, source: RepostSource, isFeed = false) => ({
    trackId,
    source,
    isFeed
  })
)

export const undoRepostTrack = createCustomAction(
  UNDO_REPOST_TRACK,
  (trackId: ID, source: RepostSource) => ({ trackId, source })
)

export const trackRepostFailed = createCustomAction(
  REPOST_FAILED,
  (trackId: ID, error: any) => ({ trackId, error })
)

export const saveTrack = createCustomAction(
  SAVE_TRACK,
  (trackId: ID, source: FavoriteSource, isFeed = false) => ({
    trackId,
    source,
    isFeed
  })
)

export const saveTrackSucceeded = createCustomAction(
  SAVE_TRACK_SUCCEEDED,
  (trackId: ID) => ({ trackId })
)

export const saveTrackFailed = createCustomAction(
  SAVE_TRACK_FAILED,
  (trackId: ID, error: any) => ({ trackId, error })
)

export const unsaveTrack = createCustomAction(
  UNSAVE_TRACK,
  (trackId: ID, source: FavoriteSource) => ({ trackId, source })
)

export const unsaveTrackSucceeded = createCustomAction(
  UNSAVE_TRACK_SUCCEEDED,
  (trackId: ID) => ({ trackId })
)

export const unsaveTrackFailed = createCustomAction(
  UNSAVE_TRACK_FAILED,
  (trackId: ID, error: any) => ({ trackId, error })
)

export const setArtistPick = createCustomAction(
  SET_ARTIST_PICK,
  (trackId: ID) => ({ trackId })
)

export const unsetArtistPick = createCustomAction(UNSET_ARTIST_PICK, () => {})

export const recordListen = createCustomAction(
  RECORD_LISTEN,
  (trackId: ID) => ({ trackId })
)

export const downloadTrack = createCustomAction(
  DOWNLOAD_TRACK,
  ({
    trackIds,
    parentTrackId,
    original
  }: {
    trackIds: ID[]
    parentTrackId?: ID
    original?: boolean
  }) => ({
    trackIds,
    parentTrackId,
    original
  })
)

export const cancelDownloads = createCustomAction(CANCEL_DOWNLOAD, () => {})

export const downloadFinished = createCustomAction(DOWNLOAD_FINISHED, () => {})

export const shareTrack = createCustomAction(
  SHARE_TRACK,
  (trackId: ID, source: ShareSource) => ({ trackId, source })
)

/**
 * Share a remix-contest event — takes the parent track's ID and
 * resolves the contest URL (`/{handle}/contest/{slug}`) in the saga.
 * Separated from `shareTrack` so analytics + clipboard target the
 * contest page rather than the underlying track.
 */
export const shareContest = createCustomAction(
  SHARE_CONTEST,
  (trackId: ID, source: ShareSource) => ({ trackId, source })
)
