import { Middleware } from 'redux'

import { NAVIGATE, NAVIGATE_REPLACE } from 'utils/navigation'

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
    return action
  }

  if (action.type === '@@router/GO_BACK') {
    if (navigateRef) {
      navigateRef(-1)
    } else {
      console.warn(
        'Navigation middleware: navigateRef not set. GO_BACK action ignored.'
      )
    }
    return action
  }

  if (action.type === '@@router/GO_FORWARD') {
    if (navigateRef) {
      navigateRef(1)
    } else {
      console.warn(
        'Navigation middleware: navigateRef not set. GO_FORWARD action ignored.'
      )
    }
    return action
  }

  return next(action)
}
