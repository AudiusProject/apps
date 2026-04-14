import { useCallback } from 'react'

import { useDispatch, useSelector } from 'react-redux'

import { ID, Name } from '~/models'
import { getPlaying, getUid } from '~/store/player/selectors'
import { QueueSource, Queueable, queueActions } from '~/store/queue'
import { makeGetCurrent } from '~/store/queue/selectors'
import { Nullable } from '~/utils'

import { useCurrentTrack } from '../useCurrentTrack'

import { TrackPlayback } from './types'

const { clear, add, play, pause } = queueActions

type RecordAnalytics = ({ name, id }: { name: TrackPlayback; id: ID }) => void

type UseToggleTrack = {
  uid: Nullable<string>
  source: QueueSource
  isPreview?: boolean
  recordAnalytics?: RecordAnalytics
  id?: Nullable<ID>
  entries?: Queueable[]
}

/**
 * Hook that exposes a function to play a track.
 * Optionally records a track play analytics event.
 *
 * @param {Function} recordAnalytics Function that tracks play event
 *
 * @returns {Function} the function that plays the track
 */
export const usePlayTrack = (recordAnalytics?: RecordAnalytics) => {
  const dispatch = useDispatch()
  const playingUid = useSelector(getUid)

  const playTrack = useCallback(
    ({
      id,
      uid,
      entries,
      passUid
    }: {
      id?: ID
      uid: string
      entries: Queueable[]
      passUid?: boolean
    }) => {
      if (playingUid !== uid) {
        dispatch(clear({}))
        dispatch(add({ entries }))
        dispatch(play({ uid }))
      } else {
        dispatch(play(passUid ? { uid } : {}))
      }
      if (recordAnalytics && id) {
        recordAnalytics({ name: Name.PLAYBACK_PLAY, id })
      }
    },
    [dispatch, recordAnalytics, playingUid]
  )

  return playTrack
}

/**
 * Hook that exposes a function to pause a track.
 * Optionally records a track pause analytics event.
 *
 * @param {Function} recordAnalytics Function that tracks pause event
 *
 * @returns {Function} the function that pauses the track
 */
export const usePauseTrack = (recordAnalytics?: RecordAnalytics) => {
  const dispatch = useDispatch()

  const pauseTrack = useCallback(
    (id?: ID) => {
      dispatch(pause({}))
      if (recordAnalytics && id) {
        recordAnalytics({ name: Name.PLAYBACK_PAUSE, id })
      }
    },
    [dispatch, recordAnalytics]
  )

  return pauseTrack
}

/**
 * Represents that props passed into the useToggleTrack hook.
 *
 * @typedef {Object} UseToggleTrackProps
 * @property {string} uid the uid of the track (nullable)
 * @property {string} source the queue source
 * @property {boolean} isPreview whether the track is a preview
 * @property {Function} recordAnalytics the function that tracks the event
 * @property {number} id the id of the track (nullable and optional)
 */

/**
 * Represents that props passed into the useToggleTrack hook.
 *
 * @typedef {Object} UseToggleTrackResult
 * @property {Function} togglePlay the function that toggles the track i.e. play/pause
 * @property {boolean} isTrackPlaying whether the track is playing or paused
 */

/**
 * Hook that exposes a togglePlay function and isTrackPlaying boolean
 * to facilitate the playing / pausing of a track.
 * Also records the play / pause action as an analytics event.
 * Leverages the useTrackPlay and useTrackPause hooks.
 *
 * @param {UseToggleTrackProps} param Object passed into function
 *
 * @returns {UseToggleTrackResult} the object that contains togglePlay and isTrackPlaying
 */
export const useToggleTrack = ({
  uid,
  source,
  recordAnalytics,
  id,
  entries: entriesProp
}: UseToggleTrack) => {
  const currentQueueItem = useSelector(makeGetCurrent())
  const currentTrack = useCurrentTrack()
  const playing = useSelector(getPlaying)
  const isTrackPlaying = !!(
    playing &&
    currentTrack &&
    currentQueueItem.uid === uid
  )

  const playTrack = usePlayTrack(recordAnalytics)
  const pauseTrack = usePauseTrack(recordAnalytics)

  const togglePlay = useCallback(() => {
    if (!id || !uid) return
    if (isTrackPlaying) {
      pauseTrack(id)
    } else {
      playTrack({
        id,
        uid,
        entries: entriesProp ?? [{ id, uid, source }]
      })
    }
  }, [playTrack, pauseTrack, isTrackPlaying, id, uid, source, entriesProp])

  return { togglePlay, isTrackPlaying }
}
