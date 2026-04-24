import { createContext, useContext } from 'react'

import { useCurrentTabScrollY } from 'react-native-collapsible-tab-view'
import type { SharedValue } from 'react-native-reanimated'
import { useAnimatedReaction } from 'react-native-reanimated'

/**
 * Context that exposes the current contest tab's scroll position as
 * a shared value. Set up in `ContestScreen` and consumed by
 * components that live OUTSIDE the collapsible `Tabs.Container`
 * (e.g. `ContestNavOverlay`), where `useCurrentTabScrollY` is
 * unavailable. Mirrors the pattern used on the profile page.
 */
export const ContestScrollContext = createContext<SharedValue<number> | null>(
  null
)

export const useContestScrollY = () => useContext(ContestScrollContext)

/**
 * Bridges the current tab's scroll position into the
 * `ContestScrollContext`. Must be rendered inside the collapsible
 * header (which sits inside `Tabs.Container`) so
 * `useCurrentTabScrollY` resolves to a real value.
 */
export const ContestScrollBridge = () => {
  const externalScrollY = useContestScrollY()
  const tabScrollY = useCurrentTabScrollY()

  useAnimatedReaction(
    () => tabScrollY.value,
    (value) => {
      if (externalScrollY) {
        externalScrollY.value = value
      }
    }
  )

  return null
}
