import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

import { useIsFocused } from '@react-navigation/native'
import type { SharedValue } from 'react-native-reanimated'
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue
} from 'react-native-reanimated'

import { useChromeHiddenProgress } from './GlassChromeContext'

const TabBarAutoHideContext = createContext<SharedValue<number> | undefined>(
  undefined
)

export const TabBarAutoHideProvider = (props: { children: ReactNode }) => {
  const hidden = useSharedValue(0)

  return (
    <TabBarAutoHideContext.Provider value={hidden}>
      {props.children}
    </TabBarAutoHideContext.Provider>
  )
}

export const useTabBarHiddenProgress = () => {
  const hidden = useContext(TabBarAutoHideContext)
  const fallback = useSharedValue(0)
  return hidden ?? fallback
}

export const useIsTabBarCollapsed = () => {
  const hidden = useTabBarHiddenProgress()
  const [isCollapsed, setIsCollapsed] = useState(false)

  useAnimatedReaction(
    () => hidden.value > 0.5,
    (current, previous) => {
      if (current !== previous) runOnJS(setIsCollapsed)(current)
    }
  )

  return isCollapsed
}

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

  useEffect(() => {
    if (isFocused && published) {
      published.value = isAtStackRoot ? hidden.value : 0
    }
  }, [isFocused, isAtStackRoot, published, hidden])

  return null
}
