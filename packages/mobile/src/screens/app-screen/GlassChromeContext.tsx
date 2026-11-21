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
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type GlassChromeContextValue = {
  headerHeight: number
  subHeaderHeight: number
  setHeaderHeight: (height: number) => void
  setSubHeaderHeight: (height: number) => void
  scrollY: SharedValue<number>
  hidden: SharedValue<number>
  directionAnchorY: SharedValue<number>
}

const ESTIMATED_HEADER_ROW_HEIGHT = 56

const DIRECTION_THRESHOLD = 6

const COMPACT_FADE_BEFORE = 20
const COMPACT_FADE_AFTER = 8

const compactFadeProgress = (scrollY: number, end: number) => {
  'worklet'
  const start = end - COMPACT_FADE_BEFORE
  const t = (scrollY - start) / (COMPACT_FADE_BEFORE + COMPACT_FADE_AFTER)
  return Math.min(1, Math.max(0, t))
}

const HIDE_TIMING = {
  duration: 380,
  easing: Easing.bezier(0.4, 0, 0.2, 1)
}

const GlassChromeContext = createContext<GlassChromeContextValue | undefined>(
  undefined
)

export const GlassChromeProvider = (props: { children: ReactNode }) => {
  const insets = useSafeAreaInsets()

  const [headerHeight, setHeaderHeightState] = useState(
    () => insets.top + ESTIMATED_HEADER_ROW_HEIGHT
  )
  const [subHeaderHeight, setSubHeaderHeightState] = useState(0)
  const scrollY = useSharedValue(0)
  const hidden = useSharedValue(0)
  const directionAnchorY = useSharedValue(0)
  const headerRowHeight = headerHeight - insets.top

  useAnimatedReaction(
    () => scrollY.value,
    (current, previous) => {
      if (previous === null) return
      if (current < headerRowHeight) {
        hidden.value = withTiming(0, HIDE_TIMING)
        directionAnchorY.value = current
        return
      }
      const delta = current - directionAnchorY.value
      if (Math.abs(delta) < DIRECTION_THRESHOLD) return
      hidden.value = withTiming(delta > 0 ? 1 : 0, HIDE_TIMING)
      directionAnchorY.value = current
    },
    [headerRowHeight]
  )

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

export const useRootHeaderHeight = () => useGlassChrome().headerHeight

export const useSubHeaderHeight = () => useGlassChrome().subHeaderHeight

export const useGlassHeaderInset = () => {
  const { headerHeight, subHeaderHeight } = useGlassChrome()
  return headerHeight + subHeaderHeight
}

export const useSetRootHeaderHeight = () => useGlassChrome().setHeaderHeight

export const useSetSubHeaderHeight = () => useGlassChrome().setSubHeaderHeight

export const useGlassScrollY = () => useGlassChrome().scrollY

export const useChromeHiddenProgress = () => useGlassChrome().hidden

export const useHeaderScrollOffset = () => {
  const scrollY = useGlassScrollY()
  const { headerHeight, subHeaderHeight } = useGlassChrome()
  const max = headerHeight + subHeaderHeight
  return useDerivedValue(() => Math.min(scrollY.value, max))
}

export const useCompactTitleProgress = () => {
  const scrollY = useGlassScrollY()
  const { headerHeight } = useGlassChrome()
  const insets = useSafeAreaInsets()
  const end = headerHeight - insets.top
  return useDerivedValue(() => compactFadeProgress(scrollY.value, end))
}

export const useCompactControlsProgress = () => {
  const scrollY = useGlassScrollY()
  const { headerHeight, subHeaderHeight } = useGlassChrome()
  const insets = useSafeAreaInsets()
  const end = headerHeight - insets.top + subHeaderHeight
  return useDerivedValue(() => compactFadeProgress(scrollY.value, end))
}

export const useCompactProgressAt = (end: number) => {
  const scrollY = useGlassScrollY()
  return useDerivedValue(() => compactFadeProgress(scrollY.value, end))
}

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

export const useGlassScrollHandler = () => {
  const scrollY = useGlassScrollY()
  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y
    },
    [scrollY]
  )
}
