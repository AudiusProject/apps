import { useCallback } from 'react'

import type { NavigationProp } from '@react-navigation/native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'

/**
 * A hook that listens for `scrollToTop` event on all parent navigators
 * When the nearest navigator is type `tab`, listens to `tabPress` event
 *
 * react-navigation exports `useScrollToTop` but it doesn't support nested navigators
 * see: https://github.com/react-navigation/react-navigation/issues/8586
 */
export const useScrollToTop = (
  scrollToTop: () => void,
  disableTopTabScroll = false
) => {
  const navigation = useNavigation()

  useFocusEffect(
    useCallback(() => {
      const parents = getParentNavigators(navigation)

      const removeListeners = parents.map((p) =>
        p.addListener('scrollToTop' as any, () => {
          scrollToTop()
        })
      )

      const removeTabListeners = (
        navigation.getState()?.type === 'tab' && !disableTopTabScroll
          ? ['tabPress', 'tabLongPress']
          : []
      ).map((e) =>
        navigation.addListener(e as any, () => {
          scrollToTop()
        })
      )

      return () => {
        removeListeners.forEach((r) => r())
        removeTabListeners.forEach((r) => r())
      }
    }, [navigation, scrollToTop, disableTopTabScroll])
  )
}

/**
 * Get array of all parent navigators
 */
const getParentNavigators = (
  navigation?: NavigationProp<any> | any,
  parents: (NavigationProp<any> | any)[] = []
): (NavigationProp<any> | any)[] => {
  if (!navigation) {
    return parents
  }
  const parent = navigation.getParent()
  return getParentNavigators(parent, [navigation, ...parents])
}
