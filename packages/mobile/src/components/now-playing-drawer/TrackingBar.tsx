import { useCallback, useEffect, useRef } from 'react'

import { useCurrentTrack } from '@audius/common/hooks'
import { playerSelectors, playbackRateValueMap } from '@audius/common/store'
import { Genre } from '@audius/common/utils'
import { Animated, Dimensions, Easing } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import TrackPlayer, { useIsPlaying } from 'react-native-track-player'
import { useSelector } from 'react-redux'
import { useAsync } from 'react-use'

import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { NOW_PLAYING_HEIGHT } from './constants'

const width = Dimensions.get('window').width

const { getSeek, getPaused, getBuffering } = playerSelectors

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
  const currentAnimation = useRef<Animated.CompositeAnimation | undefined>(
    undefined
  )

  const seek = useSelector(getSeek) ?? 0
  const { playing } = useIsPlaying()
  const buffering = useSelector(getBuffering)
  const paused = useSelector(getPaused)
  const isPlaying = playing && !buffering

  const trackGenre = useCurrentTrack({
    select: (track) => track?.genre
  })
  const playbackRate = useSelector(playerSelectors.getPlaybackRate)

  // Calculate the actual playback rate based on track type
  const isLongFormContent =
    trackGenre === Genre.PODCASTS || trackGenre === Genre.AUDIOBOOKS
  const actualPlaybackRate = isLongFormContent
    ? playbackRateValueMap[playbackRate]
    : 1.0

  const runTranslateXAnimation = useCallback(
    (timeRemaining: number) => {
      currentAnimation.current = Animated.timing(translateXAnimation.current, {
        toValue: 1,
        duration: (timeRemaining * 1000) / actualPlaybackRate,
        easing: Easing.linear,
        // Can't use native driver because this animation is potentially hours long,
        // and would have to be serialized into an array to be passed to the native layer.
        // The array exceeds the number of properties allowed in hermes
        useNativeDriver: false
      })

      currentAnimation.current.start()
    },
    [actualPlaybackRate]
  )

  useEffect(() => {
    if (duration) {
      translateXAnimation.current.setValue(0)
      runTranslateXAnimation(duration)
    }
  }, [mediaKey, duration, runTranslateXAnimation])

  useAsync(async () => {
    if (paused || buffering) {
      currentAnimation.current?.stop()
    } else if (isPlaying) {
      const { position } = await TrackPlayer.getProgress()
      runTranslateXAnimation(duration - position)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- no duration
  }, [isPlaying, paused, runTranslateXAnimation])

  useEffect(() => {
    const percentComplete = duration === 0 ? 0 : seek / duration
    const timeRemaining = duration - seek

    translateXAnimation.current.setValue(percentComplete)

    if (isPlaying) {
      runTranslateXAnimation(timeRemaining)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- no duration
  }, [seek, runTranslateXAnimation])

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
          useAngle
          angle={135}
          colors={[primaryLight2, primaryDark2]}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </Animated.View>
  )
}
