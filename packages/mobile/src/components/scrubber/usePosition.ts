import { useCallback, useEffect, useRef } from 'react'

import { useCurrentTrack } from '@audius/common/hooks'
import { playerSelectors, playbackRateValueMap } from '@audius/common/store'
import { formatSeconds, Genre } from '@audius/common/utils'
import { useAppState } from '@react-native-community/hooks'
import type { TextInput } from 'react-native'
import TrackPlayer from 'react-native-track-player'
import { useSelector } from 'react-redux'
import { useAsync } from 'react-use'

const { getPlaybackRate, getSeek, getSeekCounter, getCounter, getBuffering } =
  playerSelectors

export const usePosition = (
  mediaKey: string,
  duration: number,
  isPlaying: boolean,
  isInteracting: boolean
) => {
  const trackGenre = useCurrentTrack({
    select: (track) => track?.genre
  })
  const positionRef = useRef(0)
  const positionElementRef = useRef<TextInput>(null)
  const playbackRate = useSelector(getPlaybackRate)
  const seek = useSelector(getSeek)
  const seekCounter = useSelector(getSeekCounter)
  const counter = useSelector(getCounter)
  const isBuffering = useSelector(getBuffering)

  const setPosition = useCallback((position: number) => {
    positionRef.current = position
    positionElementRef.current?.setNativeProps({
      text: formatSeconds(positionRef.current)
    })
  }, [])

  useEffect(() => {
    let currentTimeout: ReturnType<typeof setTimeout>

    // Calculate the actual playback rate based on track type
    const isLongFormContent =
      trackGenre === Genre.PODCASTS || trackGenre === Genre.AUDIOBOOKS
    const actualPlaybackRate = isLongFormContent
      ? playbackRateValueMap[playbackRate]
      : 1.0

    const updatePosition = () => {
      const timeout = setTimeout(async () => {
        positionRef.current += 1

        positionElementRef.current?.setNativeProps({
          text: formatSeconds(positionRef.current)
        })

        if (positionRef.current <= duration) {
          currentTimeout = updatePosition()
        }
      }, 1000 / actualPlaybackRate)

      return timeout
    }

    if (isPlaying && !isInteracting && !isBuffering) {
      currentTimeout = updatePosition()
    }

    return () => {
      clearTimeout(currentTimeout)
    }
  }, [
    isPlaying,
    isInteracting,
    duration,
    playbackRate,
    counter,
    isBuffering,
    trackGenre
  ])

  // Android pauses timeouts when in background, so we use app state
  // to trigger a position coercion
  const appState = useAppState()

  useAsync(async () => {
    if (appState === 'active') {
      const { position } = await TrackPlayer.getProgress()
      positionRef.current = position
    }
  }, [appState])

  useEffect(() => {
    setPosition(0)
  }, [mediaKey, setPosition])

  useEffect(() => {
    if (seek !== null) setPosition(seek)
  }, [seek, seekCounter, setPosition])

  return { ref: positionElementRef, setPosition }
}
