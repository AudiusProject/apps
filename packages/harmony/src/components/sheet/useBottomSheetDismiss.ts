import { RefObject, useCallback, useEffect, useRef, useState } from 'react'

type Args = {
  sheetRef: RefObject<HTMLElement | null>
  dragRegionRef?: RefObject<HTMLElement | null>
  scrollRef?: RefObject<HTMLElement | null>
  enabled: boolean
  minDismissPx?: number
  dismissHeightRatio?: number
  onDismiss: () => void
}

const ENGAGE_THRESHOLD_PX = 6
const NO_DRAG_SELECTOR = '[data-no-drag]'

export const useBottomSheetDismiss = ({
  sheetRef,
  dragRegionRef,
  scrollRef,
  enabled,
  minDismissPx = 80,
  dismissHeightRatio = 1 / 4,
  onDismiss
}: Args) => {
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const offsetRef = useRef(0)
  const frameRef = useRef<number | null>(null)

  const setDragging = useCallback((next: boolean) => {
    if (isDraggingRef.current === next) return
    isDraggingRef.current = next
    setIsDragging(next)
  }, [])

  const writeSheetTransform = useCallback(
    (nextOffset: number, dragging: boolean) => {
      const sheet = sheetRef.current
      if (!sheet) return
      sheet.style.transform =
        dragging && nextOffset > 0 ? `translateY(${nextOffset}px)` : ''
      sheet.style.transition = dragging ? 'none' : ''
    },
    [sheetRef]
  )

  const scheduleSheetOffset = useCallback(
    (nextOffset: number) => {
      offsetRef.current = nextOffset
      if (frameRef.current !== null) return
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        writeSheetTransform(offsetRef.current, true)
      })
    },
    [writeSheetTransform]
  )

  const resetSheetTransform = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    offsetRef.current = 0
    writeSheetTransform(0, false)
  }, [writeSheetTransform])

  useEffect(() => {
    if (!enabled) {
      resetSheetTransform()
      setDragging(false)
    }
  }, [enabled, resetSheetTransform, setDragging])

  const onDismissRef = useRef(onDismiss)
  const minDismissRef = useRef(minDismissPx)
  const ratioRef = useRef(dismissHeightRatio)
  useEffect(() => {
    onDismissRef.current = onDismiss
    minDismissRef.current = minDismissPx
    ratioRef.current = dismissHeightRatio
  })

  useEffect(() => {
    if (!enabled) return

    const dragRegion = dragRegionRef?.current
    const scrollArea = scrollRef?.current
    if (!dragRegion && !scrollArea) return

    let activeTouchId: number | null = null
    let startY = 0
    let lastY = 0
    let engaged = false
    let startedInScroll = false

    const findTouch = (e: TouchEvent) => {
      if (activeTouchId === null) return null
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouchId) return e.touches[i]
      }
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          return e.changedTouches[i]
        }
      }
      return null
    }

    const reset = () => {
      activeTouchId = null
      engaged = false
      startedInScroll = false
      setDragging(false)
      resetSheetTransform()
    }

    const handleStart = (e: TouchEvent, fromScroll: boolean) => {
      if (activeTouchId !== null) return
      const touch = e.touches[0]
      if (!touch) return

      const target = e.target as HTMLElement | null
      if (target?.closest(NO_DRAG_SELECTOR)) return
      if (fromScroll && (scrollArea?.scrollTop ?? 0) > 0) return

      activeTouchId = touch.identifier
      startY = touch.clientY
      lastY = touch.clientY
      engaged = false
      startedInScroll = fromScroll
    }

    const handleMove = (e: TouchEvent) => {
      const touch = findTouch(e)
      if (!touch) return
      const delta = touch.clientY - startY
      lastY = touch.clientY

      if (!engaged && Math.abs(delta) < ENGAGE_THRESHOLD_PX) return

      if (delta > 0) {
        if (startedInScroll) {
          if ((scrollArea?.scrollTop ?? 0) > 0) {
            reset()
            return
          }
          e.preventDefault()
        }
        engaged = true
        scheduleSheetOffset(delta)
        setDragging(true)
      } else if (engaged) {
        scheduleSheetOffset(0)
        setDragging(false)
      }
    }

    const handleEnd = (e: TouchEvent) => {
      const touch = findTouch(e)
      if (touch) {
        lastY = touch.clientY
      }
      const totalDelta = Math.max(0, lastY - startY)
      const sheetHeight = sheetRef.current?.offsetHeight ?? 0
      const shouldDismiss =
        totalDelta > minDismissRef.current ||
        (sheetHeight > 0 && totalDelta > sheetHeight * ratioRef.current)
      reset()
      if (shouldDismiss) onDismissRef.current()
    }

    const onDragStart = (e: TouchEvent) => handleStart(e, false)
    const onScrollStart = (e: TouchEvent) => handleStart(e, true)
    const moveOpts: AddEventListenerOptions = { passive: false }
    const startOpts: AddEventListenerOptions = { passive: true }

    dragRegion?.addEventListener('touchstart', onDragStart, startOpts)
    dragRegion?.addEventListener('touchmove', handleMove, moveOpts)
    dragRegion?.addEventListener('touchend', handleEnd)
    dragRegion?.addEventListener('touchcancel', handleEnd)
    scrollArea?.addEventListener('touchstart', onScrollStart, startOpts)
    scrollArea?.addEventListener('touchmove', handleMove, moveOpts)
    scrollArea?.addEventListener('touchend', handleEnd)
    scrollArea?.addEventListener('touchcancel', handleEnd)

    return () => {
      dragRegion?.removeEventListener('touchstart', onDragStart)
      dragRegion?.removeEventListener('touchmove', handleMove)
      dragRegion?.removeEventListener('touchend', handleEnd)
      dragRegion?.removeEventListener('touchcancel', handleEnd)
      scrollArea?.removeEventListener('touchstart', onScrollStart)
      scrollArea?.removeEventListener('touchmove', handleMove)
      scrollArea?.removeEventListener('touchend', handleEnd)
      scrollArea?.removeEventListener('touchcancel', handleEnd)
    }
  }, [
    enabled,
    dragRegionRef,
    resetSheetTransform,
    scheduleSheetOffset,
    scrollRef,
    setDragging,
    sheetRef
  ])

  return { isDragging }
}

export const useSheetA11y = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose])
}
