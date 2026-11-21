import { useState, useCallback, useMemo } from 'react'

import { isMobile } from './mobile'

export const useModalControls = () => {
  const [isOpen, setIsOpen] = useState(false)
  const onClick = useCallback(() => setIsOpen(true), [setIsOpen])
  const onClose = useCallback(() => setIsOpen(false), [setIsOpen])
  return { isOpen, onClick, onClose }
}

export const useIsMobile = () =>
  useMemo(() => {
    return isMobile()
  }, [])

export const useHasCounted = (targetCount: number) => {
  const [currentCount, setCurrentCount] = useState(0)
  const incrementCount = useCallback(() => {
    setCurrentCount((count) => count + 1)
  }, [setCurrentCount])
  if (currentCount === targetCount) {
    return { has: true, inc: incrementCount }
  }
  return { has: false, inc: incrementCount }
}
