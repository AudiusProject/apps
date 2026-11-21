import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useCurrentTrack } from '@audius/common/hooks'
import { playbackSelectors, playbackRateValueMap } from '@audius/common/store'
import { Genre } from '@audius/common/utils'
import { useAppState } from '@react-native-community/hooks'
import type { GestureResponderEvent } from 'react-native'
import { View, Animated, PanResponder } from 'react-native'
import TrackPlayer from 'react-native-track-player'
import { useSelector } from 'react-redux'
import { useAsync, usePrevious } from 'react-use'

import { LinearGradient } from '@audius/harmony-native'
import { usePressScaleAnimation } from 'app/hooks/usePressScaleAnimation'
import { makeStyles } from 'app/styles'
import type { LinearAnimation } from 'app/utils/animation'
import { animateLinear, attachToDx } from 'app/utils/animation'
import { useThemeColors } from 'app/utils/theme'

const { getPlaybackRate, getSeek, getSeekCounter } = playbackSelectors

const HANDLE_GROW_SCALE = 1.1
const MARKER_SIZE = 4

const useStyles = makeStyles(({ palette, spacing }) => ({
  root: {
    height: spacing(1),
    marginLeft: spacing(4),
    marginRight: spacing(4),
    flexGrow: 1
  },
  rail: {
    backgroundColor: palette.neutralLight8,
    borderRadius: 2,
    borderColor: palette.neutralLight8,
    height: 4,
    overflow: 'hidden'
  },
  tracker: {
    flexGrow: 1,
    backgroundColor: palette.neutral,
    borderRadius: 2,
    borderColor: palette.neutralLight8,
    height: 4
  },
  handleContainer: {
    top: -6,
    position: 'absolute'
  },
  handle: {
    marginLeft: spacing(-2),
    height: spacing(4),
    width: spacing(4),
    borderRadius: spacing(2),
    backgroundColor: palette.neutralLight2,
    borderColor: palette.borderNegative,
    borderWidth: 1,
    shadowColor: 'rgb(133,129,153)',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 3
  },
  marker: {
    position: 'absolute',
    top: -8,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: palette.secondary
  }
}))

type SliderProps = {
  mediaKey: string
  isPlaying: boolean
  duration: number
  onPressIn: () => void
  onPressOut: () => void
  onNewPosition: (percentComplete: number) => void
  onDrag: (percentComplete: number) => void
  onDragRelease: () => void
  markers?: number[]
}

export const Slider = memo(function Slider(props: SliderProps) {
  const {
    mediaKey,
    isPlaying,
    duration,
    onPressIn,
    onPressOut,
    onNewPosition,
    onDrag,
    onDragRelease,
    markers
  } = props
  const trackGenre = useCurrentTrack({
    select: (track) => track?.genre
  })
  const styles = useStyles()
  const { primaryLight2, primaryDark2 } = useThemeColors()
  const seek = useSelector(getSeek)
  const seekCounter = useSelector(getSeekCounter)

  const translationAnim = useRef(new Animated.Value(0)).current
  const {
    scale: handleScale,
    handlePressIn: handlePressHandleIn,
    handlePressOut: handlePressHandleOut
  } = usePressScaleAnimation(HANDLE_GROW_SCALE)

  const railRef = useRef<View>(null)
  const [railWidth, setRailWidth] = useState(0)
  const [railPageX, setRailPageX] = useState(0)
  const [handlePosition, setHandlePosition] = useState(0)

  const getRailPageX = () => {
    if (railRef.current) {
      railRef.current.measure((x, y, width, height, pageX, pageY) => {
        setRailPageX(pageX)
      })
    }
  }

  useEffect(getRailPageX, [railRef])

  const currentAnimation = useRef<LinearAnimation | undefined>(undefined)
  const playbackRate = useSelector(getPlaybackRate)

  const isLongFormContent =
    trackGenre === Genre.Podcasts || trackGenre === Genre.Audiobooks
  const actualPlaybackRate = isLongFormContent
    ? playbackRateValueMap[playbackRate]
    : 1.0

  const play = useCallback(
    (percentComplete: number, timeRemaining: number) => {
      currentAnimation.current?.stop()
      currentAnimation.current = animateLinear(translationAnim, {
        from: percentComplete * railWidth,
        to: railWidth,
        duration: timeRemaining / actualPlaybackRate
      })
    },
    [translationAnim, railWidth, actualPlaybackRate]
  )

  const pause = useCallback(() => {
    currentAnimation.current?.stop()
  }, [currentAnimation])

  useEffect(() => pause, [pause])

  const onPressRail = useCallback(
    (e: GestureResponderEvent) => {
      const newPosition = e.nativeEvent.pageX - railPageX
      setHandlePosition(newPosition)
      Animated.timing(translationAnim, {
        duration: 100,
        toValue: newPosition,
        useNativeDriver: true
      }).start()
      handlePressHandleIn()
      onPressIn()
    },
    [
      railPageX,
      setHandlePosition,
      translationAnim,
      handlePressHandleIn,
      onPressIn
    ]
  )

  const animateFromNowToEnd = useCallback(
    (percentComplete: number) => {
      if (isPlaying && duration !== undefined) {
        play(percentComplete, (1 - percentComplete) * duration * 1000)
      }
    },
    [isPlaying, duration, play]
  )

  useEffect(() => {
    if (duration) {
      translationAnim.setValue(0)
      setHandlePosition(0)
    }
  }, [mediaKey, duration, translationAnim])

  useEffect(() => {
    if (seek !== null) {
      const percentComplete = seek / duration
      translationAnim.setValue(percentComplete * railWidth)
      setHandlePosition(percentComplete * railWidth)
      animateFromNowToEnd(percentComplete)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seek, seekCounter, duration, translationAnim, railWidth])

  const handlePressOut = useCallback(() => {
    handlePressHandleOut()
    onPressOut()
  }, [handlePressHandleOut, onPressOut])

  const onReleaseRail = useCallback(
    (e: GestureResponderEvent) => {
      const newPosition = e.nativeEvent.pageX - railPageX
      const percentComplete = newPosition / railWidth
      onNewPosition(percentComplete)
      handlePressOut()
      animateFromNowToEnd(percentComplete)
    },
    [onNewPosition, handlePressOut, railPageX, railWidth, animateFromNowToEnd]
  )

  const onPressInHandle = useCallback(
    (event: GestureResponderEvent) => {
      const newPosition = event.nativeEvent.pageX - railPageX
      setHandlePosition(newPosition)
      onPressIn()
      handlePressHandleIn()
      pause()
    },
    [onPressIn, handlePressHandleIn, pause, railPageX]
  )

  const onReleaseHandle = useCallback(
    (percentComplete: number) => {
      onNewPosition(percentComplete)
      animateFromNowToEnd(percentComplete)
    },
    [onNewPosition, animateFromNowToEnd]
  )

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => {
          return true
        },
        onPanResponderMove: (e, gestureState) => {
          const newPosition = Math.max(
            0,
            Math.min(gestureState.dx + handlePosition, railWidth)
          )
          attachToDx(translationAnim, newPosition)(e)
          onDrag(newPosition / railWidth)
        },
        onPanResponderRelease: (e, gestureState) => {
          const newPosition = Math.max(
            0,
            Math.min(gestureState.dx + handlePosition, railWidth)
          )
          attachToDx(translationAnim, newPosition)(e)
          setHandlePosition(newPosition)
          onReleaseHandle(newPosition / railWidth)
          onDragRelease()
        }
      }),
    [
      handlePosition,
      onDrag,
      onDragRelease,
      onReleaseHandle,
      railWidth,
      translationAnim
    ]
  )

  const prevMediaKey = useRef<string>(mediaKey)
  const durationRef = useRef<number>(duration)
  useEffect(() => {
    durationRef.current = duration
  }, [duration])

  useAsync(async () => {
    if (isPlaying) {
      if (durationRef.current !== undefined) {
        if (mediaKey !== prevMediaKey.current) {
          play(0, durationRef.current * 1000)
          prevMediaKey.current = mediaKey
        } else {
          const { position } = await TrackPlayer.getProgress()
          play(
            durationRef.current === 0 ? 0 : position / durationRef.current,
            (durationRef.current - position) * 1000
          )
        }
      }
    } else {
      pause()
    }
  }, [isPlaying, play, pause, mediaKey, durationRef, playbackRate])

  const appState = useAppState()
  const previousAppState = usePrevious(appState)

  useAsync(async () => {
    if (previousAppState === 'background' && appState === 'active') {
      const { position } = await TrackPlayer.getProgress()
      const percentComplete =
        durationRef.current === 0 ? 0 : position / durationRef.current
      translationAnim.setValue(percentComplete * railWidth)

      setHandlePosition(percentComplete * railWidth)
      if (isPlaying && durationRef.current !== undefined) {
        play(percentComplete, (durationRef.current - position) * 1000)
      }
    }
  }, [isPlaying, appState, previousAppState, play, railWidth, translationAnim])

  return (
    <View style={styles.root}>
      <Animated.View
        ref={railRef}
        {...panResponder.panHandlers}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout
          setRailWidth(width)
          getRailPageX()
        }}
        style={styles.rail}
        onTouchStart={onPressRail}
        onTouchEnd={onReleaseRail}
        hitSlop={{ top: 8, bottom: 8 }}
      >
        <Animated.View
          style={[
            styles.tracker,
            {
              transform: [
                {
                  translateX: translationAnim.interpolate({
                    inputRange: [0, railWidth],
                    outputRange: [-1 * railWidth, 0]
                  })
                }
              ]
            }
          ]}
        >
          {/* While dragging, show the gradient tracker */}
          <Animated.View
            style={[
              {
                flex: 1,
                opacity: handleScale.interpolate({
                  inputRange: [1, HANDLE_GROW_SCALE],
                  outputRange: [0, 1]
                })
              }
            ]}
          >
            <LinearGradient
              angle={135}
              colors={[primaryLight2, primaryDark2]}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
      {railWidth > 0
        ? markers?.map((fraction, index) => (
            <View
              key={index}
              pointerEvents='none'
              style={[
                styles.marker,
                { left: fraction * railWidth - MARKER_SIZE / 2 }
              ]}
            />
          ))
        : null}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.handleContainer,
          { transform: [{ translateX: translationAnim }] }
        ]}
      >
        <Animated.View
          onTouchStart={onPressInHandle}
          onTouchEnd={handlePressOut}
          hitSlop={{ top: 16, bottom: 16, right: 16, left: 16 }}
          style={[styles.handle, { transform: [{ scale: handleScale }] }]}
        />
      </Animated.View>
    </View>
  )
})
