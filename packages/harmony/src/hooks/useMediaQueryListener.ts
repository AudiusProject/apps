import { useEffect, useState, useCallback } from 'react'

export const useMediaQueryListener = (mediaQuery: string) => {
  const [isMatch, setIsMatch] = useState(false)

  const listener = useCallback(
    (event: MediaQueryListEvent) => setIsMatch(event.matches),
    [setIsMatch]
  )

  useEffect(() => {
    if (mediaQuery) {
      const matcher = window.matchMedia(mediaQuery)
      setIsMatch(matcher.matches)
      matcher.addEventListener?.('change', listener)
      return () => matcher.removeEventListener?.('change', listener)
    }
    return () => {}
  }, [mediaQuery, listener])

  return { isMatch }
}
