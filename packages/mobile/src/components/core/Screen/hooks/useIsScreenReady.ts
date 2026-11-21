import { useCallback, useState } from 'react'

import { useFocusEffect } from '@react-navigation/native'
import { InteractionManager } from 'react-native'

const SCHEDULING_DELAY = 1

const RESET_DELAY = 200

export const useIsScreenReady = () => {
  const [isReady, setIsReady] = useState(false)

  useFocusEffect(
    useCallback(() => {
      const interactionTimer = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          setIsReady(true)
        })
      }, SCHEDULING_DELAY)

      const resetTimer = setTimeout(() => {
        clearTimeout(interactionTimer)
        setIsReady(true)
      }, RESET_DELAY)

      return () => {
        clearTimeout(interactionTimer)
        clearTimeout(resetTimer)
        setIsReady(true)
      }
    }, [])
  )

  return isReady
}
