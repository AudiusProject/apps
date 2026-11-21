import { createContext, useContext } from 'react'

import type { SharedValue } from 'react-native-reanimated'
import { useAnimatedReaction } from 'react-native-reanimated'

import { useCurrentTabScrollY } from 'app/components/collapsible-tabs'

export const ContestScrollContext = createContext<SharedValue<number> | null>(
  null
)

export const useContestScrollY = () => useContext(ContestScrollContext)

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
