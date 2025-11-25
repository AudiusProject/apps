import { Middleware } from 'redux'

import { NAVIGATE, NAVIGATE_REPLACE } from 'utils/navigation'

// Store a reference to the navigate function
let navigateRef:
  | ((path: string, options?: { replace?: boolean; state?: any }) => void)
  | null = null

export const setNavigateRef = (
  navigate: (path: string, options?: { replace?: boolean; state?: any }) => void
) => {
  navigateRef = navigate
}

// Middleware to handle navigation actions from sagas
export const navigationMiddleware: Middleware = () => (next) => (action) => {
  if (action.type === NAVIGATE || action.type === NAVIGATE_REPLACE) {
    const { path, state, replace } = action.payload
    if (navigateRef) {
      navigateRef(path, {
        replace: replace ?? action.type === NAVIGATE_REPLACE,
        state
      })
    } else {
      console.warn(
        'Navigation middleware: navigateRef not set. Navigation action ignored:',
        action
      )
    }
    // Don't pass the action to the next middleware/reducer
    return action
  }
  return next(action)
}
