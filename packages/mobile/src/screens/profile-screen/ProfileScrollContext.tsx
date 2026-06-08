import { createContext, useContext } from 'react'

import { useCurrentTabScrollY } from 'react-native-collapsible-tab-view'
import type { SharedValue } from 'react-native-reanimated'
import { useAnimatedReaction } from 'react-native-reanimated'

/**
 * Context that exposes the current profile tab's scroll position as a
 * shared value. Set up in `ProfileScreen` and consumed by components that
 * live OUTSIDE the collapsible `Tabs.Container` (e.g. `ProfileNavOverlay`),
 * where `useCurrentTabScrollY` is unavailable.
 */
export const ProfileScrollContext = createContext<SharedValue<number> | null>(
  null
)

export const useProfileScrollY = () => useContext(ProfileScrollContext)

/**
 * Bridges the current tab's scroll position into the `ProfileScrollContext`.
 * Must be rendered inside the collapsible header (which sits inside
 * `Tabs.Container`) so `useCurrentTabScrollY` resolves to a real value.
 */
export const ProfileScrollBridge = () => {
  const externalScrollY = useProfileScrollY()
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
