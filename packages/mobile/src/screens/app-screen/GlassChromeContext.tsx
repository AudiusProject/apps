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
   * Vertical scroll offset of the screen's primary list, in px, driven off the
   * UI thread. This is the single signal the glass chrome reacts to:
   *
   * - today: the separator/shadow along the bottom of the glass fades in as
   *   soon as content slides underneath, so the stack sits flush at rest and
   *   only earns an edge once there is something behind it;
   * - next: the same value (its *direction*) is what drives auto-hiding the
   *   header and bottom tab bar on scroll-down and restoring them on
   *   scroll-up.
   */
  scrollY: SharedValue<number>
}

/** Avatar row (40) plus `spacing(3)` padding top and bottom. */
const ESTIMATED_HEADER_ROW_HEIGHT = 64

const GlassChromeContext = createContext<GlassChromeContextValue | undefined>(
  undefined
)

/**
 * Publishes the heights of the floating glass header stack to the screen
 * rendered beneath it.
 *
 * Root tab screens float their header over the content
 * (`headerTransparent`) so content scrolls behind the glass, matching the
 * desktop client. React Navigation then stops insetting the content for us,
 * so screens pad their own scrollable content by these heights: content
 * *starts* below the header but slides underneath as it scrolls.
 *
 * Two heights rather than one because several tab screens put a persistent
 * row directly under the title — feed tabs, trending pills, the library
 * category menu. Those float as a second glass layer via `FloatingSubHeader`,
 * so the list has to clear both.
 *
 * Heights are measured rather than computed: the safe-area inset differs per
 * device and `OtaUpdateBanner` adds a row only when an update is pending.
 *
 * Mounted per tab stack in `AppTabScreen`, which wraps both the navigator's
 * header and its screens.
 */
export const GlassChromeProvider = (props: { children: ReactNode }) => {
  const insets = useSafeAreaInsets()

  // Seed with the header's nominal height (avatar row + its vertical padding)
  // so the first frame lands close to the real value. Starting at 0 would
  // paint the list flush to the top and then jump it down once onLayout
  // reports — a visible flash on every cold screen mount.
  const [headerHeight, setHeaderHeightState] = useState(
    () => insets.top + ESTIMATED_HEADER_ROW_HEIGHT
  )
  const [subHeaderHeight, setSubHeaderHeightState] = useState(0)
  const scrollY = useSharedValue(0)

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
      scrollY
    }),
    [
      headerHeight,
      subHeaderHeight,
      setHeaderHeight,
      setSubHeaderHeight,
      scrollY
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
 * Snaps the chrome back to its resting state: separator hidden, header and tab
 * bar shown.
 *
 * Call this whenever the list behind the glass is swapped for a different one
 * that starts at its own offset — Feed's pager pages, Library's top tabs.
 * Those share one provider, so without a reset the chrome keeps whatever state
 * the *previous* tab earned: you scroll Tracks down until the header hides,
 * flick to an unscrolled Albums tab, and the header stays gone with nothing
 * scrolled under it. An empty tab is the worst case, since it renders no list
 * and so never emits a scroll event to correct the stale value.
 */
export const useResetGlassScroll = () => {
  const scrollY = useGlassScrollY()
  return useCallback(() => {
    scrollY.value = 0
  }, [scrollY])
}

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

/**
 * Progress of the auto-hide, 0 = fully shown, 1 = fully hidden.
 *
 * Reads the same `scrollY` the separator uses: scrolling down past the
 * threshold hides the chrome to give content the full screen, scrolling up
 * brings it straight back. Near the top, and during rubber-band overscroll
 * (negative offset), it stays shown.
 *
 * Consumers translate by their own measured height, so the header and the
 * bottom tab bar can share one signal while moving opposite directions.
 */
export const useChromeHiddenProgress = () => {
  const scrollY = useGlassScrollY()
  const hidden = useSharedValue(0)
  const lastY = useSharedValue(0)

  useAnimatedReaction(
    () => scrollY.value,
    (current, previous) => {
      if (previous === null) return
      if (current < ALWAYS_SHOWN_OFFSET) {
        hidden.value = withTiming(0, { duration: 180 })
        lastY.value = current
        return
      }
      const delta = current - lastY.value
      if (Math.abs(delta) < DIRECTION_THRESHOLD) return
      hidden.value = withTiming(delta > 0 ? 1 : 0, { duration: 180 })
      lastY.value = current
    }
  )

  return hidden
}

/**
 * Scroll handler a root screen attaches to its primary list so the glass
 * chrome can react to scrolling. Attach alongside `scrollEventThrottle={16}`.
 *
 * This is a plain JS `onScroll` rather than reanimated's
 * `useAnimatedScrollHandler` because the shared list primitives wrap React
 * Native's `Animated`, not reanimated, so a worklet handler would never
 * attach. The per-event bridge hop is cheap at this throttle, and the
 * animation itself still runs on the UI thread — the handler only writes a
 * shared value, and `useAnimatedStyle` does the interpolation.
 *
 * Only one list per screen should drive this. For a screen with a horizontal
 * pager of lineups (Feed), that means whichever page is active.
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
