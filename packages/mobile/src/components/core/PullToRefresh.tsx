import { useCallback, useEffect, useRef, useState } from 'react'

import LottieView from 'lottie-react-native'
import type {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView
} from 'react-native'
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  runOnJS,
  useSharedValue
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { usePrevious } from 'react-use'

import IconRefreshPull from 'app/assets/animations/iconRefreshPull.json'
import IconRefreshSpin from 'app/assets/animations/iconRefreshSpin.json'
import * as haptics from 'app/haptics'
import { makeAnimations, makeStyles } from 'app/styles'
import { colorize } from 'app/utils/colorizeLottie'

const PULL_DISTANCE = 75
const DEBOUNCE_TIME_MS = 0

const useAnimations = makeAnimations(({ palette }) => {
  const { neutralLight4, staticWhite } = palette
  const iconRefreshSpin = colorize(IconRefreshSpin, {
    'assets.0.layers.0.shapes.0.it.1.ck': neutralLight4
  })

  const iconRefreshPull = colorize(IconRefreshPull, {
    // arrow Outlines 4.Group 1.Stroke 1
    'assets.0.layers.0.shapes.0.it.1.c.k': neutralLight4,
    // arrow Outlines 2.Group 3.Stroke 1
    'layers.1.shapes.0.it.1.c.k': neutralLight4,
    // arrow Outlines.Group 1.Stroke 1
    'layers.2.shapes.0.it.1.c.k': neutralLight4,
    // arrow Outlines.Group 2.Stroke 1
    'layers.2.shapes.1.it.1.c.k': neutralLight4
  })

  const iconRefreshSpinWhite = colorize(IconRefreshSpin, {
    'assets.0.layers.0.shapes.0.it.1.c.k': staticWhite
  })

  const iconRefreshPullWhite = colorize(IconRefreshPull, {
    // arrow Outlines 4.Group 1.Stroke 1
    'assets.0.layers.0.shapes.0.it.1.c.k': staticWhite,
    // arrow Outlines 2.Group 3.Stroke 1
    'layers.1.shapes.0.it.1.c.k': staticWhite,
    // arrow Outlines.Group 1.Stroke 1
    'layers.2.shapes.0.it.1.c.k': staticWhite,
    // arrow Outlines.Group 2.Stroke 1
    'layers.2.shapes.1.it.1.c.k': staticWhite
  })

  return {
    neutral: {
      spin: iconRefreshSpin,
      pull: iconRefreshPull
    },
    white: { spin: iconRefreshSpinWhite, pull: iconRefreshPullWhite }
  }
})

const useStyles = makeStyles(() => ({
  root: {
    width: '100%',
    position: 'absolute',
    height: 20,
    zIndex: 10
  }
}))

type UseOverflowHandlersConfig = {
  isRefreshing?: boolean | null
  scrollResponder?: FlatList<any> | Animated.FlatList<any> | ScrollView | null
  onRefresh?: (() => void) | null
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void
}

/**
 * A helper hook to get desired pull to refresh behavior.
 * 1. Momentum scrolling does not trigger pull to refresh
 */
export const useOverflowHandlers = ({
  isRefreshing,
  scrollResponder,
  onRefresh,
  onScroll
}: UseOverflowHandlersConfig) => {
  const scrollAnim = useSharedValue(0)

  const [isMomentumScroll, setIsMomentumScroll] = useState(false)
  const currentYOffset = useRef(0)
  const wasRefreshing = usePrevious(isRefreshing)

  const scrollTo = useCallback(
    (y: number, animated = true) => {
      if (scrollResponder && 'scrollTo' in scrollResponder) {
        scrollResponder?.scrollTo({ y, animated })
      }
      if (scrollResponder && 'scrollToOffset' in scrollResponder) {
        scrollResponder?.scrollToOffset({ offset: y })
      }
    },
    [scrollResponder]
  )

  useEffect(() => {
    if (!isRefreshing && wasRefreshing && isMomentumScroll) {
      // If we don't wait, then this triggers too quickly causing scrollToTop
      // when user is already engaging with content
      const timeout = setTimeout(() => {
        if (currentYOffset.current < 0) scrollTo(0)
      }, DEBOUNCE_TIME_MS)
      return () => clearTimeout(timeout)
    }
  }, [isRefreshing, wasRefreshing, scrollTo, isMomentumScroll])

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent
      scrollAnim.value = contentOffset.y
      currentYOffset.current = contentOffset.y
      onScroll?.(event)
    },
    [onScroll, scrollAnim]
  )

  const onScrollBeginDrag = useCallback(
    (e) => {
      currentYOffset.current = e.nativeEvent.contentOffset.y
      setIsMomentumScroll(false)
    },
    [setIsMomentumScroll]
  )

  const onScrollEndDrag = useCallback(
    (e) => {
      currentYOffset.current = e.nativeEvent.contentOffset.y
      setIsMomentumScroll(true)
      if (isRefreshing && currentYOffset.current <= 0) {
        scrollTo(-50)
      }
    },
    [setIsMomentumScroll, scrollTo, isRefreshing]
  )

  return {
    isRefreshing: onRefresh ? Boolean(isRefreshing) : undefined,
    isRefreshDisabled: isMomentumScroll,
    handleRefresh: onRefresh,
    scrollAnim,
    handleScroll,
    onScrollBeginDrag,
    onScrollEndDrag
  }
}

type PullToRefreshProps = {
  isRefreshing?: boolean
  onRefresh?: () => void
  scrollY: SharedValue<number>
  isRefreshDisabled?: boolean
  topOffset?: number
  color?: string
  yOffsetDisappearance?: number
}

/**
 * Custom pull to refresh to be used with React Native ScrollViews
 * (FlatList, SectionList, etc.).
 *
 * Usage:
 * ```
 * const scrollAnim = useRef(new Animated.Value(0)).current
 *
 * const MyList = () => {
 *  return (
 *    <View>
 *      <PullToRefresh
 *        isRefreshing={}
 *        onRefresh={}
 *      />
 *      <ScrollView
 *        onScroll={attachToScroll(scrollAnim)}
 *        {...props}
 *      />
 *  )
 * }
 * ```
 *
 * Two usage modes of PullToRefresh are provided.
 * If the PullToRefresh is intended to appear in the overscroll
 * space above the view, see `useOverscrollHandlers`
 * Otherwise, the component may suffice.
 */
export const PullToRefresh = ({
  isRefreshing,
  onRefresh,
  isRefreshDisabled,
  scrollY,
  topOffset = 0,
  yOffsetDisappearance = 0,
  color
}: PullToRefreshProps) => {
  const styles = useStyles()
  const wasRefreshing = usePrevious(isRefreshing)
  const [didHitTop, setDidHitTop] = useState(false)
  const hitTop = useRef(false)
  const [shouldShowSpinner, setShouldShowSpinner] = useState(false)
  const animationRef = useRef<LottieView | null | undefined>(undefined)

  const { neutral, white } = useAnimations()
  const { spin, pull } = color ? white : neutral
  const colorizedIcon = shouldShowSpinner ? spin : pull

  useEffect(() => {
    if (
      isRefreshDisabled !== undefined
        ? !isRefreshing && isRefreshDisabled
        : !isRefreshing && wasRefreshing
    ) {
      setDidHitTop(false)
      setShouldShowSpinner(false)
      animationRef.current?.reset()
    }
  }, [isRefreshing, hitTop, wasRefreshing, isRefreshDisabled])

  const handleAnimationFinish = useCallback(
    (isCancelled: boolean) => {
      if (!isCancelled) {
        setShouldShowSpinner(true)
        setImmediate(() => {
          animationRef.current?.play()
        })
      }
    },
    [setShouldShowSpinner]
  )

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(scrollY.value, [-24, 0], [10, 0]) }
      ],
      opacity: didHitTop
        ? interpolate(
            scrollY.value,
            [-60, yOffsetDisappearance, yOffsetDisappearance + 12],
            [1, 1, 0],
            'clamp'
          )
        : interpolate(scrollY.value, [-60, -16], [1, 0], 'clamp')
    }
  }, [didHitTop, scrollY, yOffsetDisappearance])

  useAnimatedReaction(
    () => scrollY.value,
    (currentValue) => {
      if (currentValue === 0) {
        runOnJS(setDidHitTop)(false)
        hitTop.current = false
      }
      if (
        currentValue < -1 * PULL_DISTANCE &&
        !hitTop.current &&
        !isRefreshDisabled
      ) {
        hitTop.current = true
        runOnJS(setDidHitTop)(true)
        runOnJS(haptics.light)()
        runOnJS(setShouldShowSpinner)(true)
        if (onRefresh) {
          runOnJS(onRefresh)()
        }
      }
    },
    [isRefreshDisabled, onRefresh]
  )

  useEffect(() => {
    if (shouldShowSpinner) {
      animationRef.current?.play()
    }
  }, [shouldShowSpinner])

  return scrollY ? (
    <Animated.View style={[styles.root, { top: topOffset }, animatedStyles]}>
      <LottieView
        style={{ height: '100%', width: '100%' }}
        ref={(animation) => {
          if (animation) {
            animationRef.current = animation
          }
        }}
        loop={shouldShowSpinner}
        autoPlay={false}
        source={colorizedIcon}
        onAnimationFinish={handleAnimationFinish}
      />
    </Animated.View>
  ) : null
}
