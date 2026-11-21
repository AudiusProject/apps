import { useEffect } from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { useLocation } from 'react-router'

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
