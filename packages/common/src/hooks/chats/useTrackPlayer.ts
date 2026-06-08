import { useCallback } from 'react'

import { useDispatch, useSelector } from 'react-redux'

import { ID, Name } from '~/models'
import {
  playbackActions,
  playbackSelectors,
  QueueSource,
  Queueable
} from '~/store/playback'
import { Nullable } from '~/utils'

import { useCurrentTrack } from '../useCurrentTrack'

import { TrackPlayback } from './types'

const { playFrom, pause } = playbackActions
const { getPlaying, getTrackId, makeGetCurrent } = playbackSelectors

type RecordAnalytics = ({ name, id }: { name: TrackPlayback; id: ID }) => void

type UseToggleTrack = {
  id: Nullable<ID>
  source: QueueSource
  isPreview?: boolean
  recordAnalytics?: RecordAnalytics
  entries?: Queueable[]
}

const queueablesToPlaybackTracks = (entries: Queueable[]) =>
  entries
    .filter((e) => typeof e.id === 'number')
    .map((e) => ({
      trackId: e.id as ID,
      source: e.source as unknown as string,
      playerBehavior: e.playerBehavior
    }))

/**
 * Returns a function that plays a track. Used by chat track / playlist tiles
 * which build their own queue from the message contents.
 */
export const usePlayTrack = (recordAnalytics?: RecordAnalytics) => {
  const dispatch = useDispatch()
  const playingTrackId = useSelector(getTrackId)

  const playTrack = useCallback(
    ({ id, entries }: { id: ID; entries: Queueable[] }) => {
      if (playingTrackId !== id) {
        const tracks = queueablesToPlaybackTracks(entries)
        const startIndex = Math.max(
          0,
          tracks.findIndex((t) => t.trackId === id)
        )
        dispatch(playFrom({ tracks, startIndex, querySource: null }))
      } else {
        dispatch(playbackActions.play({}))
      }
      if (recordAnalytics) {
        recordAnalytics({ name: Name.PLAYBACK_PLAY, id })
      }
    },
    [dispatch, recordAnalytics, playingTrackId]
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
  id,
  source,
  recordAnalytics,
  entries: entriesProp
}: UseToggleTrack) => {
  const currentQueueItem = useSelector(makeGetCurrent())
  const currentTrack = useCurrentTrack()
  const playing = useSelector(getPlaying)
  const isTrackPlaying = !!(
    playing &&
    currentTrack &&
    currentQueueItem.trackId === id &&
    currentQueueItem.source === source
  )

  const playTrack = usePlayTrack(recordAnalytics)
  const pauseTrack = usePauseTrack(recordAnalytics)

  const togglePlay = useCallback(() => {
    if (!id) return
    if (isTrackPlaying) {
      pauseTrack(id)
    } else {
      playTrack({
        id,
        entries: entriesProp ?? [{ id, source }]
      })
    }
  }, [playTrack, pauseTrack, isTrackPlaying, id, source, entriesProp])

  return { togglePlay, isTrackPlaying }
}
