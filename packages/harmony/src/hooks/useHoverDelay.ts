import { useRef, useState, useEffect, useCallback } from 'react'

export type TriggerType = 'hover' | 'click' | 'both'

/**
 * Hook that manages delayed hover state and optional click state
 *
 * @param delay Delay in seconds before setting hovered state to true
 * @param triggeredBy Whether to trigger on hover, click, or both
 * @returns Object containing hover state and handlers
 */
export const useHoverDelay = (
  delay = 0.5,
  triggeredBy: TriggerType = 'hover'
) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up the timer when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (triggeredBy === 'click') return

    clearTimer()

    // Convert seconds to milliseconds
    const delayMs = delay * 1000

    timerRef.current = setTimeout(() => {
      setIsHovered(true)
    }, delayMs)
  }, [delay, clearTimer, triggeredBy])

  const handleMouseLeave = useCallback(() => {
    if (triggeredBy === 'click') return

    clearTimer()
    setIsHovered(false)
  }, [clearTimer, triggeredBy])

  const handleClick = useCallback(() => {
    if (triggeredBy === 'hover') return

    clearTimer()
    setIsClicked((prev) => !prev)
    // Also clear hover state when clicking
    setIsHovered(false)
  }, [clearTimer, triggeredBy])

  // Determine the final visible state based on trigger type
  const isVisible =
    triggeredBy === 'click'
      ? isClicked
      : triggeredBy === 'both'
        ? isHovered || isClicked
        : isHovered

  return {
    isHovered,
    isClicked,
    isVisible,
    handleMouseEnter,
    handleMouseLeave,
    handleClick,
    clearTimer,
    setIsHovered,
    setIsClicked
  }
}
