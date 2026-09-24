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
 * Holds the focused tab's auto-hide progress for the bottom tab bar, which
 * renders outside the per-tab `GlassChromeProvider`.
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
 *
 * Pushed screens don't drive the scroll signal, so the chrome is always shown
 * when the stack is not at its root.
 */
export const TabBarAutoHideBridge = ({
  isAtStackRoot
}: {
  isAtStackRoot: boolean
}) => {
  const hidden = useChromeHiddenProgress()
  const published = useContext(TabBarAutoHideContext)
  const isFocused = useIsFocused()

  useAnimatedReaction(
    () => hidden.value,
    (current) => {
      if (isFocused && published) {
        published.value = isAtStackRoot ? current : 0
      }
    },
    [isFocused, isAtStackRoot, published]
  )

  // Publish the current progress when the tab gains focus or the stack depth
  // changes.
  useEffect(() => {
    if (isFocused && published) {
      published.value = isAtStackRoot ? hidden.value : 0
    }
  }, [isFocused, isAtStackRoot, published, hidden])

  return null
}
