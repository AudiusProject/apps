import { useEffect, useRef } from 'react'

import { useLocation, Location } from 'react-router-dom'

/**
 * Hook to get the last location before the current one.
 * Replacement for react-router-last-location which doesn't work with v6.
 */
export const useLastLocation = (): Location | null => {
  const location = useLocation()
  const prevLocationRef = useRef<Location | null>(null)
  const currentLocationRef = useRef<Location | null>(null)

  useEffect(() => {
    // Store current location as previous before updating
    if (currentLocationRef.current) {
      prevLocationRef.current = currentLocationRef.current
    }
    // Update current location
    currentLocationRef.current = location
  }, [location])

  return prevLocationRef.current
}
