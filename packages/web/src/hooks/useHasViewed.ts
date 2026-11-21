import { useState, useRef, useEffect, useCallback } from 'react'

const useHasViewed = (
  pageOffset = 1
): [boolean, (elementRef: HTMLDivElement) => void] => {
  const [hasViewed, setHasViewed] = useState(false)

  const startAnimation = useRef<HTMLDivElement | null>(null)

  const setStartAnimation = useCallback((node: HTMLDivElement) => {
    startAnimation.current = node
  }, [])

  useEffect(() => {
    const node = startAnimation.current
    if (!node || hasViewed) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasViewed(true)
          observer.disconnect()
        }
      },
      { rootMargin: `0px 0px ${(pageOffset - 1) * 100}% 0px` }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasViewed, pageOffset])

  return [hasViewed, setStartAnimation]
}

export default useHasViewed
