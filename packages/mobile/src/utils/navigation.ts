import type { Maybe } from '@audius/common/utils'
import type { NavigationProp, NavigationState } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

/**
 * Navigation state selector that selects the current route
 * Can be passed to useNavigationState
 */
export const getRoutePath = (
  state: NavigationState | undefined,
  routePath?: string[]
): string[] | undefined => {
  if (!state || state.routes.length === 0) {
    return routePath
  }

  const { state: subState, name } = state.routes[state.index]
  return getRoutePath(subState as NavigationState, [...(routePath ?? []), name])
}

/**
 * Navigation state selector that selects the primary route
 * e.g. 'feed', 'trending', 'profile', etc
 */
export const getPrimaryRoute = (state: NavigationState | undefined) => {
  // The route at index 2 is the primary route
  return getRoutePath(state)?.[2]
}

/**
 * Given a navigator, get the nearest stack navigator in the hierarchy
 */
export const getNearestStackNavigator = (
  navigator: NavigationProp<any>
): Maybe<NativeStackNavigationProp<any>> => {
  if (navigator.getState?.()?.type === 'stack') {
    return navigator as unknown as NativeStackNavigationProp<any>
  }
  const parent = navigator.getParent()

  if (!parent) {
    return undefined
  }

  return getNearestStackNavigator(parent)
}
