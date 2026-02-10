import { useMemo } from 'react'

import { useCurrentTrack } from '@audius/common/hooks'
import { LineupState } from '@audius/common/models'
import {
  lineupSelectors,
  queueSelectors,
  playerSelectors
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { LineupVariant } from 'components/lineup/types'
import { useIsMobile } from 'hooks/useIsMobile'
import { AppState } from 'store/types'
import { useSelector } from 'utils/reducer'

const { makeGetCurrent } = queueSelectors
const { makeGetLineupMetadatas } = lineupSelectors
const { getBuffering, getPlaying } = playerSelectors

type LineupActions = any

type useLineupPropsProps = {
  getLineupSelector: (state: AppState) => LineupState<{}>
  actions: LineupActions
  variant?: LineupVariant
  numPlaylistSkeletonRows?: number
  scrollParent?: HTMLElement
  isTrending?: boolean
  isOrdered?: boolean
}

/**
 * Returns props for a Lineup component.
 * Requires at least a selector and actions
 * See example usage in `TrendingUndergroundPage`
 * */
export const useLineupProps = ({
  getLineupSelector,
  actions,
  variant,
  numPlaylistSkeletonRows,
  scrollParent,
  isTrending,
  isOrdered
}: useLineupPropsProps) => {
  const dispatch = useDispatch()
  const isMobile = useIsMobile()

  // Create memoized selectors
  const getLineup = useMemo(
    () => makeGetLineupMetadatas(getLineupSelector),
    [getLineupSelector]
  )

  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])

  const currentTrack = useCurrentTrack()

  // Selectors
  const currentQueueItem = useSelector(getCurrentQueueItem)
  const lineup = useSelector(getLineup)
  const isPlaying = useSelector(getPlaying)
  const isBuffering = useSelector(getBuffering)

  // Actions
  const pauseTrack = () => dispatch(actions.pause())
  const playTrack = (uid: string) => dispatch(actions.play(uid))
  const loadMore = (offset: number, limit: number, overwrite: boolean) => {
    dispatch(actions.fetchLineupMetadatas(offset, limit, overwrite))
  }

  return {
    lineup,
    selfLoad: true,
    variant: variant ?? LineupVariant.MAIN,
    playingUid: currentQueueItem?.uid,
    playingSource: currentQueueItem?.source,
    playingTrackId: currentTrack?.track_id ?? null,
    playing: isPlaying,
    buffering: isBuffering,
    pauseTrack,
    playTrack,
    actions,
    loadMore,
    numPlaylistSkeletonRows,
    scrollParent,
    isMobile,
    isTrending,
    ordered: isOrdered
  }
}

export const useTanQueryLineupProps = () => {
  // Create memoized selectors
  const getCurrentQueueItem = useMemo(() => makeGetCurrent(), [])

  // Selectors
  const currentQueueItem = useSelector(getCurrentQueueItem)
  const currentTrack = useCurrentTrack()
  const isBuffering = useSelector(getBuffering)

  return {
    playingUid: currentQueueItem?.uid,
    playingSource: currentQueueItem?.source,
    playingTrackId: currentTrack?.track_id ?? null,
    buffering: isBuffering
  }
}
