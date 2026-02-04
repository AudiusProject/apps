import { Middleware } from 'redux'

import { NAVIGATE, NAVIGATE_REPLACE } from 'utils/navigation'

// Store a reference to the navigate function
// React Router v7's navigate can accept a number for history navigation (-1 for back, 1 for forward)
let navigateRef:
  | ((
      path: string | number,
      options?: { replace?: boolean; state?: any }
    ) => void)
  | null = null

export const setNavigateRef = (
  navigate: (
    path: string | number,
    options?: { replace?: boolean; state?: any }
  ) => void
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

  // Handle GO_BACK action (navigate(-1) in React Router)
  if (action.type === '@@router/GO_BACK') {
    if (navigateRef) {
      navigateRef(-1)
    } else {
      console.warn(
        'Navigation middleware: navigateRef not set. GO_BACK action ignored.'
      )
    }
    // Don't pass the action to the next middleware/reducer
    return action
  }

  // Handle GO_FORWARD action (navigate(1) in React Router)
  if (action.type === '@@router/GO_FORWARD') {
    if (navigateRef) {
      navigateRef(1)
    } else {
      console.warn(
        'Navigation middleware: navigateRef not set. GO_FORWARD action ignored.'
      )
    }
    // Don't pass the action to the next middleware/reducer
    return action
  }

  return next(action)
}
