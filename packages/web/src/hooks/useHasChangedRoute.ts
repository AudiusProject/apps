import { useEffect } from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { useLocation } from 'react-router-dom'

/**
 * Custom hook that fires a callback when the route changes
 * Normally, you can use `useEffect` on the pathname from useLocation, but this
 * hook ignores the first call of useEffect
 *
 * @param {function} onRouteChange the callback fired when the route changes
 */
const useHasChangedRoute = (onRouteChange: () => void) => {
  const location = useLocation()
  const { pathname } = location
  const [getCurrentRoute, setCurrentRoute] = useInstanceVar(pathname)
  useEffect(() => {
    if (pathname !== getCurrentRoute()) {
      setCurrentRoute(pathname)
      onRouteChange()
    }
  }, [pathname, getCurrentRoute, setCurrentRoute, onRouteChange])
}

export default useHasChangedRoute
