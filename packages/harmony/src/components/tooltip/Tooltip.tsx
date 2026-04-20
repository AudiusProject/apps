import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  ReactElement,
  cloneElement,
  isValidElement
} from 'react'

import cn from 'classnames'
import ReactDOM from 'react-dom'
import { mergeRefs } from 'react-merge-refs'

import { Text } from '../text'

import styles from './Tooltip.module.css'
import type { TooltipProps, TooltipPlacement } from './types'

/**
 * Converts placement to origin objects for positioning
 */
const placementToOrigins = (
  placement: TooltipPlacement
): {
  anchorOrigin: {
    horizontal: 'left' | 'center' | 'right'
    vertical: 'top' | 'center' | 'bottom'
  }
  transformOrigin: {
    horizontal: 'left' | 'center' | 'right'
    vertical: 'top' | 'center' | 'bottom'
  }
} => {
  const mappings: Record<
    TooltipPlacement,
    {
      anchorOrigin: {
        horizontal: 'left' | 'center' | 'right'
        vertical: 'top' | 'center' | 'bottom'
      }
      transformOrigin: {
        horizontal: 'left' | 'center' | 'right'
        vertical: 'top' | 'center' | 'bottom'
      }
    }
  > = {
    top: {
      anchorOrigin: { horizontal: 'center', vertical: 'top' },
      transformOrigin: { horizontal: 'center', vertical: 'bottom' }
    },
    topLeft: {
      anchorOrigin: { horizontal: 'left', vertical: 'top' },
      transformOrigin: { horizontal: 'left', vertical: 'bottom' }
    },
    topRight: {
      anchorOrigin: { horizontal: 'right', vertical: 'top' },
      transformOrigin: { horizontal: 'right', vertical: 'bottom' }
    },
    bottom: {
      anchorOrigin: { horizontal: 'center', vertical: 'bottom' },
      transformOrigin: { horizontal: 'center', vertical: 'top' }
    },
    bottomLeft: {
      anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
      transformOrigin: { horizontal: 'left', vertical: 'top' }
    },
    bottomRight: {
      anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
      transformOrigin: { horizontal: 'right', vertical: 'top' }
    },
    left: {
      anchorOrigin: { horizontal: 'left', vertical: 'center' },
      transformOrigin: { horizontal: 'right', vertical: 'center' }
    },
    leftTop: {
      anchorOrigin: { horizontal: 'left', vertical: 'top' },
      transformOrigin: { horizontal: 'right', vertical: 'top' }
    },
    leftBottom: {
      anchorOrigin: { horizontal: 'left', vertical: 'bottom' },
      transformOrigin: { horizontal: 'right', vertical: 'bottom' }
    },
    right: {
      anchorOrigin: { horizontal: 'right', vertical: 'center' },
      transformOrigin: { horizontal: 'left', vertical: 'center' }
    },
    rightTop: {
      anchorOrigin: { horizontal: 'right', vertical: 'top' },
      transformOrigin: { horizontal: 'left', vertical: 'top' }
    },
    rightBottom: {
      anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
      transformOrigin: { horizontal: 'left', vertical: 'bottom' }
    }
  }

  return mappings[placement]
}

/**
 * Gets the x, y offsets for the given origin using the dimensions
 */
const getOriginTranslation = (
  origin: {
    horizontal: 'left' | 'center' | 'right'
    vertical: 'top' | 'center' | 'bottom'
  },
  dimensions: { width: number; height: number }
) => {
  let x = 0
  let y = 0
  const { width, height } = dimensions

  if (origin.horizontal === 'center') {
    x += width / 2
  } else if (origin.horizontal === 'right') {
    x += width
  }

  if (origin.vertical === 'center') {
    y += height / 2
  } else if (origin.vertical === 'bottom') {
    y += height
  }

  return { x, y }
}

const ARROW_SIZE = 5

export const Tooltip = ({
  children,
  className = '',
  color = 'secondary',
  disabled = false,
  mount = 'parent',
  getPopupContainer,
  mouseEnterDelay = 0.5,
  mouseLeaveDelay = 0,
  placement = 'top',
  shouldDismissOnClick = true,
  shouldWrapContent = true,
  text = '',
  zIndex
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isHiddenOverride, setIsHiddenOverride] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isPositionReady, setIsPositionReady] = useState(false)

  const triggerRef = useRef<HTMLElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const enterDelayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const leaveDelayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mousedOverRef = useRef(false)

  // Handle mouse enter with delay
  const handleMouseEnter = useCallback(() => {
    if (disabled || isHiddenOverride) return

    if (leaveDelayTimerRef.current) {
      clearTimeout(leaveDelayTimerRef.current)
      leaveDelayTimerRef.current = null
    }

    if (mouseEnterDelay > 0) {
      enterDelayTimerRef.current = setTimeout(() => {
        setIsPositionReady(false)
        setIsVisible(true)
      }, mouseEnterDelay * 1000)
    } else {
      setIsPositionReady(false)
      setIsVisible(true)
    }
  }, [disabled, isHiddenOverride, mouseEnterDelay])

  // Handle mouse leave with delay
  const handleMouseLeave = useCallback(() => {
    mousedOverRef.current = false

    if (enterDelayTimerRef.current) {
      clearTimeout(enterDelayTimerRef.current)
      enterDelayTimerRef.current = null
    }

    if (mouseLeaveDelay > 0) {
      leaveDelayTimerRef.current = setTimeout(() => {
        setIsPositionReady(false)
        setIsVisible(false)
        setIsHiddenOverride(false)
      }, mouseLeaveDelay * 1000)
    } else {
      setIsPositionReady(false)
      setIsVisible(false)
      setIsHiddenOverride(false)
    }
  }, [mouseLeaveDelay])

  // Handle tooltip mouse enter (keep it visible when hovering over tooltip)
  const handleTooltipMouseEnter = useCallback(() => {
    mousedOverRef.current = true
    if (leaveDelayTimerRef.current) {
      clearTimeout(leaveDelayTimerRef.current)
      leaveDelayTimerRef.current = null
    }
  }, [])

  // Handle tooltip mouse leave
  const handleTooltipMouseLeave = useCallback(() => {
    mousedOverRef.current = false
    handleMouseLeave()
  }, [handleMouseLeave])

  // Handle click on trigger
  const handleClick = useCallback(
    (event: any) => {
      // Call the original onClick handler from the child if it exists
      if (isValidElement(children)) {
        const originalOnClick = (children as ReactElement<{ onClick?: any }>)
          .props?.onClick
        if (typeof originalOnClick === 'function') {
          originalOnClick(event)
        }
      }

      // Handle tooltip dismissal
      if (shouldDismissOnClick) {
        setIsHiddenOverride(true)
        setIsPositionReady(false)
        setIsVisible(false)
      }
    },
    [shouldDismissOnClick, children]
  )

  const calculatePosition = useCallback(() => {
    const triggerRect = triggerRef.current?.getBoundingClientRect()
    const tooltipRect = tooltipRef.current?.getBoundingClientRect()

    if (!triggerRect || !tooltipRect) return null

    const { anchorOrigin, transformOrigin } = placementToOrigins(placement)
    const anchorTranslation = getOriginTranslation(anchorOrigin, triggerRect)
    const tooltipTranslation = getOriginTranslation(
      transformOrigin,
      tooltipRect
    )

    const top = triggerRect.y + anchorTranslation.y - tooltipTranslation.y
    const left = triggerRect.x + anchorTranslation.x - tooltipTranslation.x

    const arrowOffset = ARROW_SIZE
    let adjustedTop = top
    let adjustedLeft = left

    if (placement.startsWith('top')) {
      adjustedTop -= arrowOffset
    } else if (placement.startsWith('bottom')) {
      adjustedTop += arrowOffset
    } else if (placement.startsWith('left')) {
      adjustedLeft -= arrowOffset
    } else if (placement.startsWith('right')) {
      adjustedLeft += arrowOffset
    }

    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const padding = 8

    adjustedTop = Math.max(
      padding,
      Math.min(adjustedTop, viewportHeight - tooltipRect.height - padding)
    )
    adjustedLeft = Math.max(
      padding,
      Math.min(adjustedLeft, viewportWidth - tooltipRect.width - padding)
    )

    return { top: adjustedTop, left: adjustedLeft }
  }, [placement])

  const updatePosition = useCallback(() => {
    const nextPosition = calculatePosition()
    if (!nextPosition) return
    setPosition((current) =>
      current.top === nextPosition.top && current.left === nextPosition.left
        ? current
        : nextPosition
    )
    setIsPositionReady(true)
  }, [calculatePosition])

  // Measure position before paint to avoid flashing stale coordinates.
  useLayoutEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return
    updatePosition()
  }, [isVisible, text, updatePosition])

  // Keep tooltip synced with scrolling/resizing and short-lived layout transitions
  // (e.g. sidebar resize/translate animations).
  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return

    updatePosition()

    // Update on scroll
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    // Keep tracking briefly to absorb nearby layout transitions.
    const transitionTrackingMs = 400
    const startedAt = performance.now()
    let animationFrame = 0
    const trackTransition = () => {
      updatePosition()
      if (performance.now() - startedAt < transitionTrackingMs) {
        animationFrame = requestAnimationFrame(trackTransition)
      }
    }
    animationFrame = requestAnimationFrame(trackTransition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [isVisible, updatePosition])

  // Get portal container
  const getPortalContainer = useCallback((): HTMLElement => {
    if (getPopupContainer) {
      const container = getPopupContainer()
      if (
        container &&
        'nodeType' in container &&
        container.nodeType === Node.ELEMENT_NODE
      ) {
        return container as HTMLElement
      }
    }

    const page =
      typeof document !== 'undefined' ? document.getElementById('page') : null

    switch (mount) {
      case 'parent':
        if (triggerRef.current?.parentElement) {
          return triggerRef.current.parentElement
        }
        return page ?? document.body
      case 'page':
        // `#page` may be translated by app layout (e.g. resizable sidebar),
        // which skews fixed-position tooltip coordinates.
        return document.body
      case 'body':
        return document.body
      default:
        return document.body
    }
  }, [mount, getPopupContainer])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (enterDelayTimerRef.current) {
        clearTimeout(enterDelayTimerRef.current)
      }
      if (leaveDelayTimerRef.current) {
        clearTimeout(leaveDelayTimerRef.current)
      }
    }
  }, [])

  if (disabled) {
    return <>{children}</>
  }

  // Clone child element to add ref and event handlers
  // In React 19, ref is a regular prop, so we can merge it cleanly
  const triggerElement = isValidElement(children)
    ? cloneElement(
        children as ReactElement,
        {
          // Merge our ref with any existing ref on the child
          // In React 19, ref is accessible as a prop
          ref: mergeRefs([triggerRef, (children as any).ref]),
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
          onClick: handleClick
        } as any
      )
    : children

  const portalContainer = getPortalContainer()
  const shouldShowTooltip = isVisible && !isHiddenOverride && text

  return (
    <>
      {triggerElement}
      {shouldShowTooltip &&
        ReactDOM.createPortal(
          <div
            ref={tooltipRef}
            className={cn(styles.root, className)}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              visibility:
                isHiddenOverride || !isPositionReady ? 'hidden' : 'visible',
              zIndex: zIndex ?? undefined
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div
              className={cn(styles.tooltip, styles[placement], styles[color], {
                [styles.nonWrapping]: !shouldWrapContent
              })}
            >
              <Text
                color={color === 'white' ? 'subdued' : 'white'}
                lineHeight='single'
              >
                {text}
              </Text>
              <div className={styles.arrow} />
            </div>
          </div>,
          portalContainer
        )}
    </>
  )
}

export default Tooltip
