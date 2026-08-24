import type { ReactNode } from 'react'
import { createContext, useContext, useEffect } from 'react'

import { useIsFocused } from '@react-navigation/native'
import type { SharedValue } from 'react-native-reanimated'
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated'

import { useChromeHiddenProgress } from './GlassChromeContext'

const TabBarAutoHideContext = createContext<SharedValue<number> | undefined>(
  undefined
)

/**
 * Carries the focused tab's chrome auto-hide progress out to the bottom tab
 * bar.
 *
 * `GlassChromeProvider` is mounted per tab stack, so the scroll signal it
 * publishes is only reachable from inside a tab's own screens. The tab bar is
 * the navigator's `tabBar` — rendered as a *sibling* of the screens, not a
 * descendant — so no per-tab provider sits above it, and there are five of
 * them anyway. This provider goes above the tab navigator instead and holds
 * the single value the bar animates off; `TabBarAutoHideBridge`, mounted
 * inside each tab stack, mirrors that tab's progress into it while it is the
 * focused tab.
 */
export const TabBarAutoHideProvider = (props: { children: ReactNode }) => {
  const hidden = useSharedValue(0)

  return (
    <TabBarAutoHideContext.Provider value={hidden}>
      {props.children}
    </TabBarAutoHideContext.Provider>
  )
}

/**
 * Auto-hide progress of the bottom tab bar, 0 = fully shown, 1 = fully hidden,
 * tracking whichever tab is focused.
 *
 * Outside the provider this is a value nothing ever writes, so the bar simply
 * stays put rather than crashing a screen that renders it out of context.
 */
export const useTabBarHiddenProgress = () => {
  const hidden = useContext(TabBarAutoHideContext)
  const fallback = useSharedValue(0)
  return hidden ?? fallback
}

/**
 * Republishes this tab stack's auto-hide progress while the tab is focused.
 * Mount inside the stack's `GlassChromeProvider`; renders nothing.
 */
export const TabBarAutoHideBridge = () => {
  const hidden = useChromeHiddenProgress()
  const published = useContext(TabBarAutoHideContext)
  const isFocused = useIsFocused()

  useAnimatedReaction(
    () => hidden.value,
    (current) => {
      if (isFocused && published) published.value = current
    },
    [isFocused, published]
  )

  // A blurred tab stops scrolling, and so stops writing. The incoming tab has
  // to hand over its progress on focus, otherwise the bar keeps whatever state
  // the tab the user just left had it in.
  useEffect(() => {
    if (isFocused && published) published.value = hidden.value
  }, [isFocused, published, hidden])

  return null
}
