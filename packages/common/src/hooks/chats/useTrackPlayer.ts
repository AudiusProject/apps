import { useCallback } from 'react'

import { useDispatch, useSelector } from 'react-redux'

import { ID, Name } from '~/models'
import { playbackActions, playbackSelectors } from '~/store/playback'
import { QueueSource, Queueable } from '~/store/playback'
import { Nullable } from '~/utils'

import { useCurrentTrack } from '../useCurrentTrack'

import { TrackPlayback } from './types'

const { playFrom, pause } = playbackActions
const { getPlaying, getUid, makeGetCurrent } = playbackSelectors

type RecordAnalytics = ({ name, id }: { name: TrackPlayback; id: ID }) => void

type UseToggleTrack = {
  uid: Nullable<string>
  source: QueueSource
  isPreview?: boolean
  recordAnalytics?: RecordAnalytics
  id?: Nullable<ID>
  entries?: Queueable[]
}

const queueablesToPlaybackTracks = (entries: Queueable[]) =>
  entries
    .filter((e) => typeof e.id === 'number')
    .map((e) => ({
      trackId: e.id as ID,
      source: e.source as unknown as string,
      uid: e.uid,
      playerBehavior: e.playerBehavior
    }))

/**
 * Returns a function that plays a track. Used by chat track / playlist tiles
 * which build their own queue from the message contents.
 */
export const usePlayTrack = (recordAnalytics?: RecordAnalytics) => {
  const dispatch = useDispatch()
  const playingUid = useSelector(getUid)

  const playTrack = useCallback(
    ({
      id,
      uid,
      entries
    }: {
      id?: ID
      uid: string
      entries: Queueable[]
      passUid?: boolean
    }) => {
      if (playingUid !== uid) {
        const tracks = queueablesToPlaybackTracks(entries)
        const startIndex = Math.max(
          0,
          tracks.findIndex((t) => t.uid === uid)
        )
        dispatch(playFrom({ tracks, startIndex, querySource: null }))
      } else {
        dispatch(playbackActions.play({}))
      }
      if (recordAnalytics && id) {
        recordAnalytics({ name: Name.PLAYBACK_PLAY, id })
      }
    },
    [dispatch, recordAnalytics, playingUid]
  )

  return playTrack
}

/** Returns a function that pauses playback and optionally records analytics. */
export const usePauseTrack = (recordAnalytics?: RecordAnalytics) => {
  const dispatch = useDispatch()
  return useCallback(
    (id?: ID) => {
      dispatch(pause({}))
      if (recordAnalytics && id) {
        recordAnalytics({ name: Name.PLAYBACK_PAUSE, id })
      }
    },
    [dispatch, recordAnalytics]
  )
}

/**
 * Hook that exposes a togglePlay function and an isTrackPlaying flag for
 * a single track. Leverages usePlayTrack / usePauseTrack and records
 * play/pause analytics events.
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
