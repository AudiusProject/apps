import React, { useCallback, useRef, useState } from 'react'

import cn from 'classnames'

import styles from './Slider.module.css'
import { SliderProps } from './types'

const getXPosition = (element: HTMLDivElement) => {
  const coords = element.getBoundingClientRect()
  return window.pageXOffset + coords.left
}

export const Slider = ({
  defaultValue = 0,
  value,
  max,
  onChange,
  showHandle
}: SliderProps) => {
  const [isActive, setIsActive] = useState(false)

  const dragPercent = useRef<number | null>(0)

  const mouseMoveRef = useRef<((this: Document, ev: MouseEvent) => any) | null>(
    null
  )
  const mouseUpRef = useRef<((this: Document, ev: MouseEvent) => any) | null>(
    null
  )
  const touchMoveRef = useRef<((e: TouchEvent) => any) | null>(null)
  const touchEndRef = useRef<((e: TouchEvent) => any) | null>(null)

  const railRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  const setDragPercent = useCallback(
    (pageX: number) => {
      if (railRef.current) {
        const clickPosition = pageX - getXPosition(railRef.current)
        const railWidth = railRef.current.offsetWidth
        const percent =
          Math.min(Math.max(0, clickPosition), railWidth) / railWidth
        dragPercent.current = percent
      }
    },
    [dragPercent]
  )

  const setDragPercentMouse = useCallback(
    (e: React.MouseEvent | MouseEvent) => setDragPercent(e.pageX),
    [setDragPercent]
  )

  const setDragPercentTouch = useCallback(
    (e: React.TouchEvent | TouchEvent) => setDragPercent(e.touches[0].pageX),
    [setDragPercent]
  )

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      setDragPercentMouse(e)
      if (dragPercent.current !== null) onChange(dragPercent.current * max)
    },
    [setDragPercentMouse, max, onChange]
  )

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      e.stopPropagation()
      e.preventDefault()

      setDragPercentTouch(e)
      if (dragPercent.current !== null) onChange(dragPercent.current * max)
    },
    [setDragPercentTouch, max, onChange]
  )

  const onMouseUp = useCallback(() => {
    setIsActive(false)
    if (mouseMoveRef.current) {
      document.removeEventListener('mousemove', mouseMoveRef.current)
    }
    if (mouseUpRef.current) {
      document.removeEventListener('mouseup', mouseUpRef.current)
    }

    if (dragPercent.current !== null) dragPercent.current = null
  }, [mouseMoveRef, mouseUpRef, dragPercent])

  const onTouchEnd = useCallback(() => {
    setIsActive(false)
    if (touchMoveRef.current) {
      document.removeEventListener('touchmove', touchMoveRef.current)
    }
    if (touchEndRef.current) {
      document.removeEventListener('touchend', touchEndRef.current)
    }

    if (dragPercent.current !== null) dragPercent.current = null
  }, [touchMoveRef, touchEndRef, dragPercent])

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || touchMoveRef.current) return

    mouseMoveRef.current = onMouseMove
    mouseUpRef.current = onMouseUp
    document.addEventListener('mousemove', mouseMoveRef.current)
    document.addEventListener('mouseup', mouseUpRef.current)
    setIsActive(true)

    setDragPercentMouse(e)
    if (dragPercent.current !== null) onChange(dragPercent.current * max)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchMoveRef.current = onTouchMove
    touchEndRef.current = onTouchEnd
    document.addEventListener('touchmove', touchMoveRef.current)
    document.addEventListener('touchend', touchEndRef.current)
    setIsActive(true)

    setDragPercentTouch(e)
    if (dragPercent.current !== null) onChange(dragPercent.current * max)
  }

  const transformStyles = { transform: `translate(${(value / max) * 100}%)` }

  return (
    <div
      className={cn(styles.slider, {
        [styles.active]: isActive,
        [styles.showHandle]: showHandle
      })}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <div ref={railRef} className={styles.rail}>
        <div
          ref={trackRef}
          className={styles.trackWrapper}
          style={transformStyles}
        >
          <div ref={trackRef} className={styles.track} />
        </div>
      </div>
      {showHandle !== false ? (
        <div
          ref={handleRef}
          className={styles.handleWrapper}
          style={transformStyles}
        >
          <div ref={handleRef} className={styles.handle} />
        </div>
      ) : null}
    </div>
  )
}
