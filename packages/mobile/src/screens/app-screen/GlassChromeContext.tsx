import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'

import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import {
  useAnimatedReaction,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type GlassChromeContextValue = {
  headerHeight: number
  subHeaderHeight: number
  setHeaderHeight: (height: number) => void
  setSubHeaderHeight: (height: number) => void
  /**
   * Scroll offset of the screen's primary list; drives the separator fade and
   * the chrome auto-hide.
   */
  scrollY: SharedValue<number>
  /** Auto-hide progress, 0 = fully shown, 1 = fully hidden. */
  hidden: SharedValue<number>
  /** Offset the next scroll direction is measured from. */
  directionAnchorY: SharedValue<number>
}

/** Avatar row (40) plus `spacing(3)` padding top and bottom. */
const ESTIMATED_HEADER_ROW_HEIGHT = 64

/**
 * Distance (px) the user must move in one direction before the chrome flips
 * between hidden and shown. Without it, sub-pixel jitter at the end of a
 * fling would flap the header.
 */
const DIRECTION_THRESHOLD = 6

/**
 * Below this offset the chrome is always shown, so the top of a list never
 * opens with the header already dismissed.
 */
const ALWAYS_SHOWN_OFFSET = 40

const HIDE_DURATION_MS = 180

const GlassChromeContext = createContext<GlassChromeContextValue | undefined>(
  undefined
)

/**
 * Publishes the heights of the floating glass header stack, and the scroll
 * signal it reacts to, to the screens rendered beneath it.
 *
 * Root tab screens float their header over the content (`headerTransparent`)
 * so content scrolls behind the glass. Screens pad their own scrollable
 * content by these heights: the root header plus an optional
 * `FloatingSubHeader` row. Heights are measured because the safe-area inset
 * varies per device and `OtaUpdateBanner` adds a row when an update is
 * pending.
 *
 * Mounted per tab stack in `AppTabScreen`.
 */
export const GlassChromeProvider = (props: { children: ReactNode }) => {
  const insets = useSafeAreaInsets()

  // Seed with the header's nominal height (avatar row + its vertical padding)
  // so the first frame lands close to the real value. Starting at 0 would
  // paint the list flush to the top and then jump it down once onLayout
  // reports, a visible flash on every cold screen mount.
  const [headerHeight, setHeaderHeightState] = useState(
    () => insets.top + ESTIMATED_HEADER_ROW_HEIGHT
  )
  const [subHeaderHeight, setSubHeaderHeightState] = useState(0)
  const scrollY = useSharedValue(0)
  const hidden = useSharedValue(0)
  const directionAnchorY = useSharedValue(0)

  // Scrolling down hides the chrome and scrolling up brings it back. Near the
  // top, and during rubber-band overscroll (negative offset), it stays shown.
  useAnimatedReaction(
    () => scrollY.value,
    (current, previous) => {
      if (previous === null) return
      if (current < ALWAYS_SHOWN_OFFSET) {
        hidden.value = withTiming(0, { duration: HIDE_DURATION_MS })
        directionAnchorY.value = current
        return
      }
      const delta = current - directionAnchorY.value
      if (Math.abs(delta) < DIRECTION_THRESHOLD) return
      hidden.value = withTiming(delta > 0 ? 1 : 0, {
        duration: HIDE_DURATION_MS
      })
      directionAnchorY.value = current
    }
  )

  // Guard against re-render loops: onLayout fires on every layout pass, and
  // sub-pixel jitter on a measured row would otherwise churn context.
  const setHeaderHeight = useCallback((height: number) => {
    setHeaderHeightState((current) =>
      Math.abs(current - height) < 1 ? current : height
    )
  }, [])

  const setSubHeaderHeight = useCallback((height: number) => {
    setSubHeaderHeightState((current) =>
      Math.abs(current - height) < 1 ? current : height
    )
  }, [])

  const value = useMemo(
    () => ({
      headerHeight,
      subHeaderHeight,
      setHeaderHeight,
      setSubHeaderHeight,
      scrollY,
      hidden,
      directionAnchorY
    }),
    [
      headerHeight,
      subHeaderHeight,
      setHeaderHeight,
      setSubHeaderHeight,
      scrollY,
      hidden,
      directionAnchorY
    ]
  )

  return (
    <GlassChromeContext.Provider value={value}>
      {props.children}
    </GlassChromeContext.Provider>
  )
}

const useGlassChrome = () => {
  const context = useContext(GlassChromeContext)
  if (!context) {
    throw new Error(
      'Glass chrome hooks must be used inside a <GlassChromeProvider>'
    )
  }
  return context
}

/** Height of the floating root header alone. */
export const useRootHeaderHeight = () => useGlassChrome().headerHeight

/**
 * Total height of the floating glass stack (header + sub-header). This is the
 * top padding a screen's scrollable content needs so it starts below the glass
 * and scrolls behind it.
 */
export const useGlassHeaderInset = () => {
  const { headerHeight, subHeaderHeight } = useGlassChrome()
  return headerHeight + subHeaderHeight
}

/** Setter used by `MobileRootHeader` to report its measured height. */
export const useSetRootHeaderHeight = () => useGlassChrome().setHeaderHeight

/** Setter used by `FloatingSubHeader` to report its measured height. */
export const useSetSubHeaderHeight = () => useGlassChrome().setSubHeaderHeight

/** Raw scroll offset shared value, for chrome that animates off scroll. */
export const useGlassScrollY = () => useGlassChrome().scrollY

/**
 * Auto-hide progress, 0 = fully shown, 1 = fully hidden. Consumers translate
 * by their own measured height, so the header and the tab bar share it while
 * moving in opposite directions.
 */
export const useChromeHiddenProgress = () => useGlassChrome().hidden

/**
 * Points the chrome at a list that is already scrolled to `offset`. Call when
 * the list behind the glass is swapped for another that keeps its own scroll
 * position (Feed's pager pages), so the swap isn't read as a scroll.
 */
export const useSyncGlassScroll = () => {
  const { scrollY, directionAnchorY } = useGlassChrome()
  return useCallback(
    (offset: number) => {
      directionAnchorY.value = offset
      scrollY.value = offset
    },
    [scrollY, directionAnchorY]
  )
}

/**
 * Scroll handler a root screen attaches to its primary list, with
 * `scrollEventThrottle={16}`. A plain JS `onScroll` because the core list
 * primitives wrap React Native's `Animated`, not reanimated. Only one list per
 * screen should drive it.
 */
export const useGlassScrollHandler = () => {
  const scrollY = useGlassScrollY()
  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y
    },
    [scrollY]
  )
}
