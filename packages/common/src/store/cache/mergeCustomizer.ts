import { ID } from '~/models/Identifiers'

const forceUpdateKeys = new Set([
  'field_visibility',
  'followee_reposts',
  'followee_saves',
  'stream_conditions',
  'download_conditions'
])

export const mergeCustomizer = (objValue: any, srcValue: any, key: string) => {
  if (forceUpdateKeys.has(key)) {
    return srcValue
  }

  if (key === 'is_verified') {
    return srcValue || objValue
  }

  if (key === 'is_delete' && objValue === true && srcValue === false) {
    return objValue
  }

  if (key === 'stream_conditions' || key === 'download_conditions') {
    return srcValue || objValue
  }

  if (objValue && key === 'playlist_contents') {
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
