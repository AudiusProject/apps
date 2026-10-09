import { useCallback, useEffect, useRef } from 'react'

import { useCurrentTrack } from '@audius/common/hooks'
import { playbackSelectors, playbackRateValueMap } from '@audius/common/store'
import { Genre } from '@audius/common/utils'
import { Animated, Dimensions } from 'react-native'
import TrackPlayer, { useIsPlaying } from 'react-native-track-player'
import { useSelector } from 'react-redux'
import { useAsync } from 'react-use'

import { LinearGradient } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'
import type { LinearAnimation } from 'app/utils/animation'
import { animateLinear } from 'app/utils/animation'
import { useThemeColors } from 'app/utils/theme'

import { NOW_PLAYING_HEIGHT } from './constants'

const width = Dimensions.get('window').width

const { getSeek, getPaused, getBuffering } = playbackSelectors

const useStyles = makeStyles(({ palette }) => ({
  rail: {
    height: 2,
    width: '100%',
    backgroundColor: palette.neutralLight7,
    overflow: 'hidden'
  },
  tracker: {
    height: 3,
    // flexGrow: 1,
    backgroundColor: 'red'
  }
}))

type TrackingBarProps = {
  /**
   * A unique key to represent this instances of playback.
   * If the user replays the same track, mediaKey should change
   */
  mediaKey: string
  duration: number
  /**
   * Animation that signals how "open" the now playing drawer is.
   */
  translateYAnimation: Animated.Value
}

export const TrackingBar = (props: TrackingBarProps) => {
  const { mediaKey, duration, translateYAnimation } = props
  const styles = useStyles()
  const { primaryLight2, primaryDark2 } = useThemeColors()

  const translateXAnimation = useRef(new Animated.Value(0))
  const currentAnimation = useRef<LinearAnimation | undefined>(undefined)

  const seek = useSelector(getSeek) ?? 0
  const { playing } = useIsPlaying()
  const buffering = useSelector(getBuffering)
  const paused = useSelector(getPaused)
  const isPlaying = playing && !buffering

  const trackGenre = useCurrentTrack({
    select: (track) => track?.genre
  })
  const playbackRate = useSelector(playbackSelectors.getPlaybackRate)

  // Calculate the actual playback rate based on track type
  const isLongFormContent =
    trackGenre === Genre.Podcasts || trackGenre === Genre.Audiobooks
  const actualPlaybackRate = isLongFormContent
    ? playbackRateValueMap[playbackRate]
    : 1.0

  const runTranslateXAnimation = useCallback(
    (percentComplete: number, timeRemaining: number) => {
      currentAnimation.current?.stop()
      currentAnimation.current = animateLinear(translateXAnimation.current, {
        from: percentComplete,
        to: 1,
        duration: (timeRemaining * 1000) / actualPlaybackRate
      })
    },
    [actualPlaybackRate]
  )

  useEffect(() => {
    if (duration) {
      runTranslateXAnimation(0, duration)
    }
  }, [mediaKey, duration, runTranslateXAnimation])

  useAsync(async () => {
    if (paused || buffering) {
      currentAnimation.current?.stop()
    } else if (isPlaying) {
      const { position } = await TrackPlayer.getProgress()
      runTranslateXAnimation(
        duration === 0 ? 0 : position / duration,
        duration - position
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- no duration
  }, [isPlaying, paused, runTranslateXAnimation])

  useEffect(() => {
    const percentComplete = duration === 0 ? 0 : seek / duration
    const timeRemaining = duration - seek

    if (isPlaying) {
      runTranslateXAnimation(percentComplete, timeRemaining)
    } else {
      translateXAnimation.current.setValue(percentComplete)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- no duration
  }, [seek, runTranslateXAnimation])

  useEffect(() => () => currentAnimation.current?.stop(), [])

  const rootOpacity = translateYAnimation.interpolate({
    // Interpolate the animation such that the tracker fades out
    // at 5% up the screen.
    // The tracker is important to fade away shortly after
    // the now playing drawer is opened so that the drawer may
    // animate in corner radius without showing at the same time
    // as the tracker.
    inputRange: [0, 0.9 * NOW_PLAYING_HEIGHT, NOW_PLAYING_HEIGHT],
    outputRange: [0, 0, 2]
  })

  const trackerTransform = [
    {
      translateX: translateXAnimation.current.interpolate({
        inputRange: [0, 1],
        outputRange: [-1 * width, 0]
      })
    }
  ]

  return (
    <Animated.View style={[styles.rail, { opacity: rootOpacity }]}>
      <Animated.View style={[styles.tracker, { transform: trackerTransform }]}>
        <LinearGradient
          angle={135}
          colors={[primaryLight2, primaryDark2]}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </Animated.View>
  )
}
