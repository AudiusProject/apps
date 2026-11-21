import { createContext, useContext } from 'react'

import type { SharedValue } from 'react-native-reanimated'
import { useAnimatedReaction } from 'react-native-reanimated'

import { useCurrentTabScrollY } from 'app/components/collapsible-tabs'

export const ProfileScrollContext = createContext<SharedValue<number> | null>(
  null
)

export const useProfileScrollY = () => useContext(ProfileScrollContext)

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
