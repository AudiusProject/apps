import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * `useHasViewed` checks if the reference element has scrolled into view.
 * @param {number} [pageOffset] Multiplies the viewport height to set the
 *   trigger boundary. 1 (default) = full viewport; 0.5 = top half only;
 *   values > 1 trigger before the element reaches the visible area.
 */
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
