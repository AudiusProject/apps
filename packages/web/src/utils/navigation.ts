// Navigation utilities - use react-router-dom hooks instead
// For Redux actions, use useNavigate hook from react-router-dom
// LOCATION_CHANGE is no longer needed with react-router-dom v6

// Legacy export for compatibility - these should be replaced with useNavigate
export const LOCATION_CHANGE = '@@router/LOCATION_CHANGE'

// Navigation actions for use in Redux sagas
// These actions can be dispatched from sagas and will be handled by navigation middleware
export const NAVIGATE = '@@router/NAVIGATE'
export const NAVIGATE_REPLACE = '@@router/NAVIGATE_REPLACE'

// Support both path strings and objects with search/hash/state
type NavigationTarget =
  | string
  | { path?: string; search?: string; hash?: string; state?: any }

export const push = (target: NavigationTarget, state?: any) => {
  if (typeof target === 'string') {
    return {
      type: NAVIGATE,
      payload: { path: target, state, replace: false }
    }
  } else {
    // Handle object with search/hash/path
    const path = target.path ?? window.location.pathname
    const search = target.search ?? ''
    const hash = target.hash ?? ''
    const fullPath = `${path}${search}${hash}`
    return {
      type: NAVIGATE,
      payload: { path: fullPath, state: target.state ?? state, replace: false }
    }
  }
}

export const replace = (target: NavigationTarget, state?: any) => {
  if (typeof target === 'string') {
    return {
      type: NAVIGATE_REPLACE,
      payload: { path: target, state, replace: true }
    }
  } else {
    // Handle object with search/hash/path
    const path = target.path ?? window.location.pathname
    const search = target.search ?? ''
    const hash = target.hash ?? ''
    const fullPath = `${path}${search}${hash}`
    return {
      type: NAVIGATE_REPLACE,
      payload: { path: fullPath, state: target.state ?? state, replace: true }
    }
  }
}

// Legacy exports for backwards compatibility
export const goBack = () => ({ type: '@@router/GO_BACK' })
export const goForward = () => ({ type: '@@router/GO_FORWARD' })

// Add any additional navigation utilities here if needed
