import { useCallback, useMemo } from 'react'

import type {
  ParamListBase,
  NavigationProp as RNNavigationProp
} from '@react-navigation/native'
import { useNavigation as useNativeNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { isEqual } from 'lodash'

import { getNearestStackNavigator } from 'app/utils/navigation'

export type ContextualParams = {
  fromNotifications?: boolean
  fromAppDrawer?: boolean
}

export type ContextualizedParamList<ParamList extends ParamListBase> = {
  [K in keyof ParamList]: ParamList[K] & ContextualParams
}

type PerformNavigationConfig<
  ParamList extends ParamListBase,
  RouteName extends keyof ParamList = keyof ParamList
> = [screen: RouteName, params?: ParamList[RouteName] & ContextualParams]

type UseNavigationOptions<NavigationProp extends RNNavigationProp<any>> = {
  customNavigation?: NavigationProp
}

let lastNavAction: any
export const setLastNavAction = (action: any) => {
  lastNavAction = action
}

/**
 * Custom wrapper around react-navigation `useNavigation`
 *
 * Features:
 * - Prevent duplicate navigation pushes
 * - Apply contextual params to all routes
 */
export function useNavigation<
  ParamList extends ParamListBase,
  NavigationProp extends
    RNNavigationProp<ParamListBase> = NativeStackNavigationProp<ParamList>
>(options?: UseNavigationOptions<NavigationProp>): NavigationProp {
  const defaultNavigation = useNativeNavigation<NavigationProp>()

  const navigation: NavigationProp =
    options?.customNavigation ?? defaultNavigation

  // Prevent duplicate pushes by de-duping
  // navigation actions
  const performCustomPush = useCallback(
    (...config: PerformNavigationConfig<ParamList>) => {
      if (!isEqual(lastNavAction, config)) {
        const stackNavigator = getNearestStackNavigator(navigation)

        if (stackNavigator) {
          ;(stackNavigator.push as any)(...config)

          // Set lastNavAction, it will be reset via an event handler in AppTabScreen
          setLastNavAction(config)
        }
      }
    },
    [navigation]
  )

  return useMemo(
    () => ({
      ...navigation,
      push:
        'push' in navigation
          ? performCustomPush
          : () => {
              console.error('Push is not implemented for this navigator')
            }
    }),
    [navigation, performCustomPush]
  )
}
