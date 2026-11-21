import { useRef, useCallback } from 'react'
import * as React from 'react'

/**
 * Hook for initializing playback update mechanism. Uses rAF to sync element
 * positions to the current playback position.
 */
export const usePlaybackPositionTracking = (
  trackRef: React.MutableRefObject<HTMLDivElement | null>,
  handleRef: React.MutableRefObject<HTMLDivElement | null>,
  getAudioPosition: () => number,
  getTotalTime: () => number
) => {
  const isPlayingRef = useRef(false)
  const getAudioPositionRef = useRef(getAudioPosition)
  const overridePositionRef = useRef(0)
  const overridePositionEnabledRef = useRef(false)
  const getTotalTimeRef = useRef(getTotalTime)

  const updatePositionRef = useRef(() => {
    if (trackRef.current && handleRef.current) {
      const audioPosition = getAudioPositionRef.current()
      const totalTime = getTotalTimeRef.current()
      const percentComplete = overridePositionEnabledRef.current
        ? overridePositionRef.current
        : audioPosition / totalTime
      const translation = `translate(${percentComplete * 100}%)`
      handleRef.current.style.transform = translation
      trackRef.current.style.transform = translation
    }

    if (isPlayingRef.current) {
      window.requestAnimationFrame(updatePositionRef.current)
    }
  })

  /** Starts a rAF loop to grab the current player position and update continuously */
  const play = useCallback(() => {
    isPlayingRef.current = true
    window.requestAnimationFrame(updatePositionRef.current)
  }, [updatePositionRef, isPlayingRef])

  const pause = useCallback(() => {
    isPlayingRef.current = false
  }, [isPlayingRef])

  const refreshPosition = useCallback(() => {
    if (!isPlayingRef.current) {
      window.requestAnimationFrame(updatePositionRef.current)
    }
  }, [updatePositionRef, isPlayingRef])

  /** Allows temporary override for things like scrubbing */
  const setPosition = useCallback(
    (position = 0) => {
      overridePositionRef.current = position
      refreshPosition()
    },
    [overridePositionRef, refreshPosition]
  )

  const setPositionOverrideEnabled = useCallback((enabled: boolean) => {
    overridePositionEnabledRef.current = enabled
  }, [])

  return {
    play,
    pause,
    refreshPosition,
    setPositionOverrideEnabled,
    setPosition
  }
}
