import { ID } from '~/models/Identifiers'

// These are fields we never want to merge -
// we should always prefer the latest update from
// backend.
const forceUpdateKeys = new Set([
  'field_visibility',
  'followee_reposts',
  'followee_saves',
  'stream_conditions',
  'download_conditions'
])

// Customize lodash recursive merge to never merge
// the forceUpdateKeys, and special-case
// playlist_contents
export const mergeCustomizer = (objValue: any, srcValue: any, key: string) => {
  if (forceUpdateKeys.has(key)) {
    return srcValue
  }

  if (key === 'is_verified') {
    return srcValue || objValue
  }

  // Delete is unidirectional (after marked deleted, future updates are not reflected)
  if (key === 'is_delete' && objValue === true && srcValue === false) {
    return objValue
  }

  if (key === 'stream_conditions' || key === 'download_conditions') {
    return srcValue || objValue
  }

  // For playlist_contents, this is trickier.
  // We want to never merge because playlists can have
  // tracks be deleted since last time, but
  // new fetches won't have UIDs, so we need to preserve those.
  if (objValue && key === 'playlist_contents') {
    // Map out tracks keyed by id, but store as an array-value
    // because a playlist can contain multiple of the same track id
    const trackMap: Record<ID, { track: any }[]> = {}
    objValue.track_ids.forEach((t: { track: any }) => {
      const id = t.track
      if (id in trackMap) {
        trackMap[id].push(t)
      } else {
        trackMap[id] = [t]
      }
    })

    const trackIds = srcValue.track_ids.map((t: { track: string | number }) => {
      const mappedList = trackMap[t.track]
      if (!mappedList) return t

      const mappedTrack = mappedList.shift()
      if (!mappedTrack?.uid) return t

      return {
        ...t,
        uid: mappedTrack.uid
      }
    })

    return { ...srcValue, track_ids: trackIds }
  }
}
