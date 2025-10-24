import { queryAccountUser } from '@audius/common/api'
import {
  Name,
  TrackAccessType,
  isContentFollowGated,
  isContentTipGated,
  isContentTokenGated,
  isContentUSDCPurchaseGated,
  Track
} from '@audius/common/models'
import { call, put } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'

function getTrackAccess({
  is_stream_gated,
  stream_conditions
}: Track): TrackAccessType {
  if (is_stream_gated && stream_conditions) {
    if (isContentFollowGated(stream_conditions)) {
      return TrackAccessType.FOLLOW_GATED
    } else if (isContentTipGated(stream_conditions)) {
      return TrackAccessType.TIP_GATED
    } else if (isContentTokenGated(stream_conditions)) {
      return TrackAccessType.TOKEN_GATED
    } else if (isContentUSDCPurchaseGated(stream_conditions)) {
      return TrackAccessType.USDC_GATED
    }
  }
  return TrackAccessType.PUBLIC
}

/** Detects and dispatches any analytics events we are interested in for a track edit */
export function* recordEditTrackAnalytics(prevTrack: Track, newTrack: Track) {
  // Note: if remixes is not defined in field_visibility, it defaults to true
  if (
    (prevTrack?.field_visibility?.remixes ?? true) &&
    newTrack?.field_visibility?.remixes === false
  ) {
    const accountUser = yield* call(queryAccountUser)
    const handle = accountUser?.handle
    // Record event if hide remixes was turned on
    yield* put(
      make(Name.REMIX_HIDE, {
        id: newTrack.track_id,
        handle
      })
    )
  }
  const prevTrackAccess = getTrackAccess(prevTrack)
  const newTrackAccess = getTrackAccess(newTrack)
  if (prevTrackAccess !== newTrackAccess) {
    yield* put(
      make(Name.TRACK_EDIT_ACCESS_CHANGED, {
        id: newTrack.track_id,
        from: prevTrackAccess,
        to: newTrackAccess
      })
    )
  }

  if (prevTrack.bpm !== newTrack.bpm && newTrack.bpm) {
    yield* put(
      make(Name.TRACK_EDIT_BPM_CHANGED, {
        id: newTrack.track_id,
        from: prevTrack.bpm,
        to: newTrack.bpm
      })
    )
  }

  if (prevTrack.musical_key !== newTrack.musical_key && newTrack.musical_key) {
    yield* put(
      make(Name.TRACK_EDIT_MUSICAL_KEY_CHANGED, {
        id: newTrack.track_id,
        from: prevTrack.musical_key,
        to: newTrack.musical_key
      })
    )
  }

  if (
    prevTrack.comments_disabled !== newTrack.comments_disabled &&
    newTrack.comments_disabled
  ) {
    yield* put(
      make(Name.COMMENTS_DISABLE_TRACK_COMMENTS, {
        trackId: newTrack.track_id
      })
    )
  }
}
