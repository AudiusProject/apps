import { DragEventHandler, ReactNode, useRef, useState } from 'react'

import throttle from 'lodash/throttle'

const SCROLL_TIMEOUT_DURATION_MS = 20
const SCROLL_STEP_PX = 5
const DRAG_HANDLER_THROTTLE_DURATION_MS = 200
const DISTANCE_FROM_EDGE_AUTOSCROLL_THRESHOLD_PX = 16

type DragAutoscrollerProps = {
  children: ReactNode
  containerBoundaries: {
    top: number
    bottom: number
    left: number
    right: number
  }
  updateScrollTopPosition: (difference: number) => void
  onChangeDragScrollingDirection: (
    newDirection: 'up' | 'down' | undefined
  ) => void
}

export const DragAutoscroller = ({
  children,
  containerBoundaries,
  updateScrollTopPosition,
  onChangeDragScrollingDirection
}: DragAutoscrollerProps) => {
  const [scrolling, setScrolling] = useState<undefined | 'up' | 'down'>()
  const scrollingRef = useRef(scrolling)
  scrollingRef.current = scrolling

  const scroll = (direction: 'up' | 'down') => {
    const difference = direction === 'up' ? -SCROLL_STEP_PX : SCROLL_STEP_PX
    updateScrollTopPosition(difference)
    if (scrollingRef.current != null) {
      setTimeout(
        () => scroll(scrollingRef.current!),
        SCROLL_TIMEOUT_DURATION_MS
      )
    }
  }

  const throttledHandleDragHelper = throttle(
    (clientX: number, clientY: number) => {
      const isInRightLeftBounds =
        clientX &&
        clientX > containerBoundaries.left &&
        clientX < containerBoundaries.right
      if (
        clientY &&
        clientY <=
          containerBoundaries.top +
            DISTANCE_FROM_EDGE_AUTOSCROLL_THRESHOLD_PX &&
        isInRightLeftBounds
      ) {
        if (scrollingRef.current !== 'up') {
          setScrolling('up')
          onChangeDragScrollingDirection('up')
          setTimeout(() => scroll('up'), SCROLL_TIMEOUT_DURATION_MS)
        }
      } else if (
        clientY &&
        clientY >=
          containerBoundaries.bottom -
            DISTANCE_FROM_EDGE_AUTOSCROLL_THRESHOLD_PX &&
        isInRightLeftBounds
      ) {
        if (scrollingRef.current !== 'down') {
          setScrolling('down')
          onChangeDragScrollingDirection('down')
          setTimeout(() => scroll('down'), SCROLL_TIMEOUT_DURATION_MS)
        }
      } else if (scrollingRef.current != null) {
        onChangeDragScrollingDirection(undefined)
        setScrolling(undefined)
      }
    },
    DRAG_HANDLER_THROTTLE_DURATION_MS
  )

  const handleDrag: DragEventHandler<HTMLDivElement> = (e) => {
    const clientX = e.clientX
    const clientY = e.clientY
    throttledHandleDragHelper(clientX, clientY)
  }

  const handleDragEnd: DragEventHandler<HTMLDivElement> = () => {
    setScrolling(undefined)
    onChangeDragScrollingDirection(undefined)
  }

  return (
    <div onDragEnter={handleDrag} onDrag={handleDrag} onDragEnd={handleDragEnd}>
      {children}
    </div>
  )
}
