import type { GestureResponderEvent, NativeScrollEvent } from 'react-native'
import { Animated, Easing } from 'react-native'
import {
  createAnimatedPropAdapter,
  processColor
} from 'react-native-reanimated'

// The native driver precomputes one frame per 16ms, so a track-length
// animation would send a huge array to native. Run it as short linear
// segments, each started from the wall-clock position so it can't drift.
const LINEAR_SEGMENT_MS = 10000

export type LinearAnimation = { stop: () => void }

export const animateLinear = (
  value: Animated.Value,
  { from, to, duration }: { from: number; to: number; duration: number }
): LinearAnimation => {
  const startedAt = Date.now()
  let stopped = false
  let segment: Animated.CompositeAnimation | undefined

  const valueAt = (elapsed: number) =>
    duration > 0 ? from + (to - from) * Math.min(1, elapsed / duration) : to

  const runSegment = () => {
    if (stopped) return
    const elapsed = Date.now() - startedAt
    value.setValue(valueAt(elapsed))
    if (elapsed >= duration) return
    const segmentEnd = Math.min(duration, elapsed + LINEAR_SEGMENT_MS)
    segment = Animated.timing(value, {
      toValue: valueAt(segmentEnd),
      duration: segmentEnd - elapsed,
      easing: Easing.linear,
      useNativeDriver: true
    })
    segment.start(({ finished }) => {
      if (finished) runSegment()
    })
  }

  runSegment()

  return {
    stop: () => {
      stopped = true
      segment?.stop()
    }
  }
}

export const attachToDx =
  (animation: Animated.Value, newValue: number) =>
  (e: GestureResponderEvent) => {
    Animated.event(
      [
        null,
        {
          dx: animation
        }
      ],
      { useNativeDriver: false }
    )(e, { dx: newValue })
  }

export const attachToDy =
  (animation: Animated.Value, newValue: number) =>
  (e: GestureResponderEvent) => {
    Animated.event(
      [
        null,
        {
          dy: animation
        }
      ],
      { useNativeDriver: false }
    )(e, { dy: newValue })
  }

/**
 * Attaches an animated value to an onScroll.
 * ```
 * const animation = useRef(new Animated.Value(0)).current
 * <List
 *  onScroll={attachToScroll(animation)}
 * />
 * ```
 * Note that we cannot set a custom onScroll and use this animated event
 * or we do not get the ability to useNativeDriver.
 * If you wish to add custom scroll functionality and attach an animation,
 * native driver cannot be used.
 */
export const attachToScroll = (
  animation: Animated.Value,
  config?: Partial<Animated.EventConfig<NativeScrollEvent>>
) =>
  Animated.event([{ nativeEvent: { contentOffset: { y: animation } } }], {
    useNativeDriver: true,
    ...config
  })

export const animatedPropAdapter = createAnimatedPropAdapter((props) => {
  if (Object.keys(props).includes('fill')) {
    props.fill = { type: 0, payload: processColor(props.fill) }
  }
  if (Object.keys(props).includes('stroke')) {
    props.stroke = { type: 0, payload: processColor(props.stroke) }
  }
})
