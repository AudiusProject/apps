import { getTrackQueryKey } from '~/api/tan-query/queryKeys'
import { getAllEntries } from '~/store/cache/selectors'
import { CommonState } from '~/store/commonStore'

import { Kind, ID, UID, Status, Track, StemTrack } from '../../../models'

/** @deprecated Use useTrack instead */
export const getTrack = (
  state: CommonState,
  props: { id?: ID | null; uid?: UID | null; permalink?: string | null }
) => {
  if (
    props.permalink &&
    state.tracks.permalinks[props.permalink.toLowerCase()]
  ) {
    props.id = state.tracks.permalinks[props.permalink.toLowerCase()]
  }
  return state.queryClient.getQueryData(getTrackQueryKey(props.id))
}

export const getStatus = (state: CommonState, props: { id?: ID | null }) =>
  (props.id && state.tracks.statuses[props.id]) || null

/** @deprecated Use useTracks instead */
export const getTracks = (
  state: CommonState,
  props: {
    ids?: ID[] | null
    uids?: UID[] | null
    permalinks?: string[] | null
  }
) => {
  if (props && props.ids) {
    const tracks: { [id: number]: Track } = {}
    props.ids.forEach((id) => {
      const track = getTrack(state, { id })
      if (track) {
        tracks[id] = track
      }
    })
    return tracks
  } else if (props && props.uids) {
    const tracks: { [id: number]: Track } = {}
    props.uids.forEach((uid) => {
      const track = getTrack(state, { uid })
      if (track) {
        tracks[track.track_id] = track
      }
    })
    return tracks
  } else if (props && props.permalinks) {
    const tracks: { [permalink: string]: Track } = {}
    props.permalinks.forEach((permalink) => {
      const track = getTrack(state, { permalink })
      if (track) tracks[permalink] = track
    })
    return tracks
  }
  return getAllEntries(state, { kind: Kind.TRACKS })
}

// TODO:
export const getTracksByUid = (state: CommonState) => {
  return Object.keys(state.tracks.uids).reduce(
    (entries, uid) => {
      entries[uid] = getTrack(state, { uid })
      return entries
    },
    {} as { [uid: string]: Track | null }
  )
}

export const getStatuses = (state: CommonState, props: { ids: ID[] }) => {
  const statuses: { [id: number]: Status } = {}
  props.ids.forEach((id) => {
    const status = getStatus(state, { id })
    if (status) {
      statuses[id] = status
    }
  })
  return statuses
}

export const getStems = (state: CommonState, trackId?: ID) => {
  if (!trackId) return []

  const track = getTrack(state, { id: trackId })
  if (!track?._stems?.length) return []

  const stemIds = track._stems.map((s) => s.track_id)

  const stemsMap = getTracks(state, { ids: stemIds }) as {
    [id: number]: StemTrack
  }
  const stems = Object.values(stemsMap).filter(
    (t) => !t.is_delete && !t._marked_deleted
  )
  return stems
}
