import { useCallback, useEffect, useRef } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import {
  LEGACY_PLAYBACK_POSITION_LS_KEY,
  PLAYBACK_POSITION_LS_KEY,
  PlaybackPositionState,
  playbackPositionActions,
  playbackPositionSelectors,
  playbackSelectors
} from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { localStorage } from 'services/local-storage'

const { initializePlaybackPositionState } = playbackPositionActions
const { getPlaybackPositions } = playbackPositionSelectors
const { getPlaying, getTrackId } = playbackSelectors

// Positions change every second during long-form playback, so batch the
// localStorage writes. Pending writes are flushed when the page is hidden.
const PERSIST_INTERVAL_MS = 5000

export const usePlaybackPositionPersistence = () => {
  const dispatch = useDispatch()
  const positions = useSelector(getPlaybackPositions)
  const playing = useSelector(getPlaying)
  const trackId = useSelector(getTrackId)
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

  const pendingPositions = useRef<PlaybackPositionState | null>(null)
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (persistTimeout.current) {
      clearTimeout(persistTimeout.current)
      persistTimeout.current = null
    }
    if (!pendingPositions.current) return
    localStorage.setItem(
      PLAYBACK_POSITION_LS_KEY,
      JSON.stringify(pendingPositions.current)
    )
    pendingPositions.current = null
  }, [])

  useEffect(() => {
    if (!hasHydrated.current) return
    pendingPositions.current = positions
    if (!persistTimeout.current) {
      persistTimeout.current = setTimeout(flush, PERSIST_INTERVAL_MS)
    }
  }, [positions, flush])

  // Write right away when playback starts, pauses or moves to another track
  useEffect(() => {
    flush()
  }, [playing, trackId, flush])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      flush()
    }
  }, [flush])
}
