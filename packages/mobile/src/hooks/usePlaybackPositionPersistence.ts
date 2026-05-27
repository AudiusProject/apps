import { useEffect, useRef } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import type { PlaybackPositionState } from '@audius/common/store'
import {
  LEGACY_PLAYBACK_POSITION_LS_KEY,
  PLAYBACK_POSITION_LS_KEY,
  playbackPositionActions,
  playbackPositionSelectors
} from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { localStorage } from 'app/services/local-storage'

const { initializePlaybackPositionState } = playbackPositionActions
const { getPlaybackPositions } = playbackPositionSelectors

export const usePlaybackPositionPersistence = () => {
  const dispatch = useDispatch()
  const positions = useSelector(getPlaybackPositions)
  const { data: currentUserId } = useCurrentUserId()
  const hasHydrated = useRef(false)

  useEffect(() => {
    if (hasHydrated.current) return
    let cancelled = false
    const hydrate = async () => {
      const newState = await localStorage.getItem(PLAYBACK_POSITION_LS_KEY)
      if (cancelled) return
      if (newState !== null) {
        const parsed: PlaybackPositionState = JSON.parse(newState)
        dispatch(
          initializePlaybackPositionState({ playbackPositionState: parsed })
        )
        hasHydrated.current = true
        return
      }
      const legacy = await localStorage.getItem(LEGACY_PLAYBACK_POSITION_LS_KEY)
      if (cancelled) return
      if (legacy === null) {
        hasHydrated.current = true
        return
      }
      if (!currentUserId) return
      const legacyParsed: PlaybackPositionState[number] = JSON.parse(legacy)
      const converted: PlaybackPositionState = {
        [currentUserId]: legacyParsed
      }
      dispatch(
        initializePlaybackPositionState({ playbackPositionState: converted })
      )
      localStorage.setItem(PLAYBACK_POSITION_LS_KEY, JSON.stringify(converted))
      localStorage.removeItem(LEGACY_PLAYBACK_POSITION_LS_KEY)
      hasHydrated.current = true
    }
    hydrate()
    return () => {
      cancelled = true
    }
  }, [currentUserId, dispatch])

  useEffect(() => {
    if (!hasHydrated.current) return
    localStorage.setItem(PLAYBACK_POSITION_LS_KEY, JSON.stringify(positions))
  }, [positions])
}

export const PlaybackPositionPersistence = () => {
  usePlaybackPositionPersistence()
  return null
}
