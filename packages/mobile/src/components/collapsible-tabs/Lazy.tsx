import React, { useCallback, useLayoutEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  useAnimatedStyle
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { ScrollView } from './ScrollView'
import { useScroller, useTabNameContext, useTabsContext } from './hooks'

export const Lazy: React.FC<{
  cancelLazyFadeIn?: boolean
  mountDelayMs?: number
  startMounted?: boolean
  children: React.ReactElement
}> = ({
  children,
  cancelLazyFadeIn,
  startMounted: _startMounted,
  mountDelayMs = 50
}) => {
  const name = useTabNameContext()
  const { focusedTab, refMap } = useTabsContext()

  const didTriggerLayout = useSharedValue(false)

  const [canMount, setCanMount] = React.useState(false)
  const isSelfMounted = React.useRef(true)

  const opacity = useSharedValue(0)

  useLayoutEffect(() => {
    const shouldStartMounted =
      typeof _startMounted === 'boolean'
        ? _startMounted
        : focusedTab.value === name
    let initialOpacity = 1
    if (!cancelLazyFadeIn && !shouldStartMounted) {
      initialOpacity = 0
    }
    opacity.value = initialOpacity
  }, [cancelLazyFadeIn, focusedTab, name, _startMounted, opacity])

  React.useEffect(() => {
    return () => {
      isSelfMounted.current = false
    }
  }, [])

  const startMountTimer = React.useCallback(
    (focusedTab: string) => {
      setTimeout(() => {
        if (focusedTab === name) {
          if (isSelfMounted.current) setCanMount(true)
        }
      }, mountDelayMs)
    },
    [mountDelayMs, name]
  )

  useAnimatedReaction(
    () => {
      return focusedTab.value === name
    },
    (focused, wasFocused) => {
      if (focused && !wasFocused && !canMount) {
        if (cancelLazyFadeIn) {
          opacity.value = 1
          scheduleOnRN(setCanMount, true)
        } else {
          scheduleOnRN(startMountTimer, focusedTab.value)
        }
      }
    },
    [canMount, focusedTab]
  )

  const scrollTo = useScroller()

  const ref = name ? refMap[name] : null

  useAnimatedReaction(
    () => {
      return didTriggerLayout.value
    },
    (isMounted, wasMounted) => {
      if (isMounted && !wasMounted) {
        if (!cancelLazyFadeIn && opacity.value !== 1) {
          opacity.value = withTiming(1)
        }
      }
    },
    [ref, cancelLazyFadeIn, name, didTriggerLayout, scrollTo]
  )

  const stylez = useAnimatedStyle(() => {
    return {
      opacity: opacity.value
    }
  }, [opacity])

  const onLayout = useCallback(() => {
    didTriggerLayout.value = true
  }, [didTriggerLayout])

  return canMount ? (
    cancelLazyFadeIn ? (
      children
    ) : (
      <Animated.View
        pointerEvents='box-none'
        style={[styles.container, !cancelLazyFadeIn ? stylez : undefined]}
        onLayout={onLayout}
      >
        {children}
      </Animated.View>
    )
  ) : (
    <ScrollView />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
})
