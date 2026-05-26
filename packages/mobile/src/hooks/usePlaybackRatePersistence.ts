import { useEffect, useRef } from 'react'

import type { PlaybackRate } from '@audius/common/store'
import {
  PLAYBACK_RATE_LS_KEY,
  playbackActions,
  playbackSelectors
} from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { localStorage } from 'app/services/local-storage'

const { setPlaybackRate } = playbackActions
const { getPlaybackRate } = playbackSelectors

export const usePlaybackRatePersistence = () => {
  const dispatch = useDispatch()
  const playbackRate = useSelector(getPlaybackRate)
  const hasHydrated = useRef(false)

  useEffect(() => {
    let cancelled = false
    localStorage.getItem(PLAYBACK_RATE_LS_KEY).then((rate) => {
      if (cancelled) return
      if (rate) {
        dispatch(setPlaybackRate({ rate: rate as PlaybackRate }))
      }
      hasHydrated.current = true
    })
    return () => {
      cancelled = true
    }
  }, [dispatch])

  useEffect(() => {
    if (!hasHydrated.current) return
    localStorage.setItem(PLAYBACK_RATE_LS_KEY, playbackRate)
  }, [playbackRate])
}

export const PlaybackRatePersistence = () => {
  usePlaybackRatePersistence()
  return null
}
