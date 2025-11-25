import type { Location } from 'history'

import { AppState } from 'store/types'

// These selectors are deprecated - use useLocation hook from react-router-dom instead
// Keeping for backwards compatibility during migration
export const getLocation = (state: AppState): Location | undefined => {
  // Router state no longer exists in Redux - return undefined
  // Use useLocation hook from react-router-dom instead
  return undefined
}

export const getLocationPathname = (state: AppState): string => {
  // Router state no longer exists in Redux - return empty string
  // Use useLocation hook from react-router-dom and getPathname(location) instead
  return ''
}
