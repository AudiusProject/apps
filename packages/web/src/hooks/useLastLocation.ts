import { useEffect, useRef } from 'react'

import { useLocation, Location } from 'react-router'

export const useLastLocation = (): Location | null => {
  const location = useLocation()
  const prevLocationRef = useRef<Location | null>(null)
  const currentLocationRef = useRef<Location | null>(null)

  useEffect(() => {
    if (currentLocationRef.current) {
      prevLocationRef.current = currentLocationRef.current
    }
    currentLocationRef.current = location
  }, [location])

  return prevLocationRef.current
}
