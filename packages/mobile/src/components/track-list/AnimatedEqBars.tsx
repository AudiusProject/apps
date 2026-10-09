import { useEffect, useRef } from 'react'

import { Animated, Easing, StyleSheet, View } from 'react-native'

const BAR_COUNT = 4
const BAR_MIN_HEIGHT = 4
const BAR_MAX_HEIGHT = 18
const BAR_COLOR = '#CC5DE8'

const BAR_DURATIONS_MS = [520, 410, 640, 470]
const BAR_DELAYS_MS = [0, 180, 90, 260]

// Each bar is a full-height bar slid down inside a rounded clip, so the
// native driver can animate it with translateY instead of height.
const BAR_MIN_OFFSET = BAR_MAX_HEIGHT - BAR_MIN_HEIGHT

type AnimatedEqBarsProps = {
  isPlaying: boolean
}

export const AnimatedEqBars = ({ isPlaying }: AnimatedEqBarsProps) => {
  const offsets = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(BAR_MIN_OFFSET))
  ).current

  useEffect(() => {
    if (!isPlaying) {
      offsets.forEach((offset) => offset.stopAnimation())
      return
    }

    const loops = offsets.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(BAR_DELAYS_MS[i]),
          Animated.timing(value, {
            toValue: 0,
            duration: BAR_DURATIONS_MS[i],
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true
          }),
          Animated.timing(value, {
            toValue: BAR_MIN_OFFSET,
            duration: BAR_DURATIONS_MS[i],
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true
          })
        ])
      )
    )

    loops.forEach((loop) => loop.start())

    return () => {
      loops.forEach((loop) => loop.stop())
    }
  }, [isPlaying, offsets])

  return (
    <View style={styles.container} pointerEvents='none'>
      {offsets.map((offset, i) => (
        <View key={i} style={styles.barClip}>
          <Animated.View
            style={[styles.bar, { transform: [{ translateY: offset }] }]}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    height: BAR_MAX_HEIGHT,
    paddingBottom: 2
  },
  barClip: {
    width: 4,
    height: BAR_MAX_HEIGHT,
    borderRadius: 2,
    overflow: 'hidden'
  },
  bar: {
    height: BAR_MAX_HEIGHT,
    borderRadius: 2,
    backgroundColor: BAR_COLOR
  }
})
