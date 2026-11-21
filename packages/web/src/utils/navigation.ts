export const LOCATION_CHANGE = '@@router/LOCATION_CHANGE'

export const NAVIGATE = '@@router/NAVIGATE'
export const NAVIGATE_REPLACE = '@@router/NAVIGATE_REPLACE'

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

export const goBack = () => ({ type: '@@router/GO_BACK' })
export const goForward = () => ({ type: '@@router/GO_FORWARD' })
