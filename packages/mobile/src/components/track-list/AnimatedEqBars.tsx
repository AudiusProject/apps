import { useEffect, useRef } from 'react'

import { Animated, Easing, StyleSheet, View } from 'react-native'

const BAR_COUNT = 4
const BAR_MIN_HEIGHT = 4
const BAR_MAX_HEIGHT = 18
const BAR_COLOR = '#CC5DE8'

const BAR_DURATIONS_MS = [520, 410, 640, 470]
const BAR_DELAYS_MS = [0, 180, 90, 260]

type AnimatedEqBarsProps = {
  isPlaying: boolean
}

export const AnimatedEqBars = ({ isPlaying }: AnimatedEqBarsProps) => {
  const heights = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(BAR_MIN_HEIGHT))
  ).current

  useEffect(() => {
    if (!isPlaying) {
      heights.forEach((h) => h.stopAnimation())
      return
    }

    const loops = heights.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(BAR_DELAYS_MS[i]),
          Animated.timing(value, {
            toValue: BAR_MAX_HEIGHT,
            duration: BAR_DURATIONS_MS[i],
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false
          }),
          Animated.timing(value, {
            toValue: BAR_MIN_HEIGHT,
            duration: BAR_DURATIONS_MS[i],
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false
          })
        ])
      )
    )

    loops.forEach((loop) => loop.start())

    return () => {
      loops.forEach((loop) => loop.stop())
    }
  }, [isPlaying, heights])

  return (
    <View style={styles.container} pointerEvents='none'>
      {heights.map((height, i) => (
        <Animated.View key={i} style={[styles.bar, { height }]} />
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
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: BAR_COLOR
  }
})
