import { useEffect, useLayoutEffect, useState } from 'react'

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Observes an element's inline size and returns whether it is below
 * `thresholdPx`. State only updates when the threshold is crossed, so
 * consumers do not re-render on every resize frame.
 */
export const useIsContainerNarrow = (
  ref: { readonly current: HTMLElement | null },
  thresholdPx: number
): boolean => {
  const [isNarrow, setIsNarrow] = useState(false)

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const update = (width: number) => {
      setIsNarrow((prev) => {
        const next = width < thresholdPx
        return prev === next ? prev : next
      })
    }

    update(el.getBoundingClientRect().width)

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, thresholdPx])

  return isNarrow
}
