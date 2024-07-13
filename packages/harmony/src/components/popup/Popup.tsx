import {
  forwardRef,
  MutableRefObject,
  Ref,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { useTheme } from '@emotion/react'
import cn from 'classnames'
import ReactDOM from 'react-dom'
import { useTransition, animated } from 'react-spring'

import { PlainButton } from 'components/button'
import { IconClose } from 'icons'
import { ModalState } from 'utils/modalState'

import { useClickOutside } from '../../hooks/useClickOutside'
import { getScrollParent } from '../../utils/getScrollParent'

import styles from './Popup.module.css'
import type { PopupProps, Origin } from './types'

const messages = {
  close: 'close popup'
}

/**
 * Number of pixels between the edge of the container and the popup
 * before the popup needs to reposition itself to be in view.
 */
const CONTAINER_INSET_PADDING = 16

/**
 * Figures out whether the specified position would overflow the window
 * and picks a better position accordingly
 * @param {Origin} anchorOrigin where the origin is on the trigger
 * @param {Origin} transformOrigin where the origin is on the popup
 * @param {DOMRect} anchorRect the position and size of the trigger
 * @param {DOMRect} wrapperRect the position and size of the popup
 * @return {{ anchorOrigin: Origin, transformOrigin: Origin }} the new origin after accounting for overflow
 */
const getComputedOrigins = (
  anchorOrigin: Origin,
  transformOrigin: Origin,
  anchorRect: DOMRect,
  wrapperRect: DOMRect,
  portal: HTMLElement,
  containerRef?: MutableRefObject<HTMLDivElement | undefined>
) => {
  if (!anchorRect || !wrapperRect) return { anchorOrigin, transformOrigin }

  let containerWidth, containerHeight
  if (containerRef && containerRef.current) {
    containerWidth =
      containerRef.current.getBoundingClientRect().width -
      CONTAINER_INSET_PADDING
    containerHeight =
      containerRef.current.getBoundingClientRect().height -
      CONTAINER_INSET_PADDING
  } else {
    containerWidth =
      portal.getBoundingClientRect().width - CONTAINER_INSET_PADDING
    containerHeight =
      portal.getBoundingClientRect().height - CONTAINER_INSET_PADDING
  }

  // Get new wrapper position
  const anchorTranslation = getOriginTranslation(anchorOrigin, anchorRect)
  const wrapperTranslation = getOriginTranslation(transformOrigin, wrapperRect)
  const wrapperX = anchorRect.x + anchorTranslation.x - wrapperTranslation.x
  const wrapperY = anchorRect.y + anchorTranslation.y - wrapperTranslation.y

  // Check bounds of the wrapper in new position are inside container
  const overflowRight = wrapperX + wrapperRect.width > containerWidth
  const overflowLeft = wrapperX < 0
  const overflowBottom = wrapperY + wrapperRect.height > containerHeight
  const overflowTop = wrapperY < 0

  // For all overflows, flip the position
  if (overflowRight) {
    anchorOrigin.horizontal = 'left'
    transformOrigin.horizontal = 'right'
  }
  if (overflowLeft) {
    anchorOrigin.horizontal = 'right'
    transformOrigin.horizontal = 'left'
  }
  if (overflowTop) {
    anchorOrigin.vertical = 'bottom'
    transformOrigin.vertical = 'top'
  }
  if (overflowBottom) {
    anchorOrigin.vertical = 'top'
    transformOrigin.vertical = 'bottom'
  }
  return { anchorOrigin, transformOrigin }
}

/**
 * Figures out whether the specified position would still overflow the window
 * after being computed and adds extra offsets
 */
const getAdjustedPosition = (
  top: number,
  left: number,
  wrapperRect: DOMRect,
  portal: HTMLElement
): { adjustedTop: number; adjustedLeft: number } => {
  if (!wrapperRect) return { adjustedTop: 0, adjustedLeft: 0 }

  const containerWidth =
    portal.getBoundingClientRect().width - CONTAINER_INSET_PADDING
  const containerHeight =
    portal.getBoundingClientRect().height - CONTAINER_INSET_PADDING
  // Account for the portal being a scrollable container.
  // This will happen if the document body itself is what scrolls.
  const containerTop = -1 * portal.getBoundingClientRect().top

  const overflowRight = left + wrapperRect.width > containerWidth
  const overflowLeft = left < 0
  const overflowBottom = top + wrapperRect.height > containerHeight
  const overflowTop = top < 0

  const adjusted = { adjustedTop: containerTop, adjustedLeft: 0 }
  if (overflowRight) {
    adjusted.adjustedLeft =
      adjusted.adjustedLeft - (left + wrapperRect.width - containerWidth)
  }
  if (overflowLeft) {
    adjusted.adjustedLeft = adjusted.adjustedLeft + wrapperRect.width
  }
  if (overflowTop) {
    adjusted.adjustedTop =
      adjusted.adjustedTop - (top + wrapperRect.height - containerHeight)
  }
  if (overflowBottom) {
    adjusted.adjustedTop = adjusted.adjustedTop + wrapperRect.height
  }
  return adjusted
}

/**
 * Gets the x, y offsets for the given origin using the dimensions
 * @param origin the relative origin
 * @param dimensions the dimensions to use with the relative origin
 * @returns the x and y coordinates of the new origin relative to the old one
 */
const getOriginTranslation = (
  origin: Origin,
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

const defaultAnchorOrigin: Origin = {
  horizontal: 'center',
  vertical: 'bottom'
}

const defaultTransformOrigin: Origin = {
  horizontal: 'center',
  vertical: 'top'
}

const closingAnimationDuration = 90

/**
 * A popup is an in-place container that shows on top of the UI. A popup does
 * not impact the rest of the UI (e.g. dimming background or shifting elements).
 * It differs from modals, which do take over the whole UI and are usually
 * center-screened.
 */
export const Popup = forwardRef<HTMLDivElement, PopupProps>(function Popup(
  props: PopupProps,
  ref: Ref<HTMLDivElement>
) {
  const { isVisible: isVisibleProp } = props
  const [popupState, setPopupState] = useState<ModalState>('closed')

  const isVisible = popupState !== 'closed'
  useEffect(() => {
    if (popupState === 'closed' && isVisibleProp) {
      setPopupState('opening')
    } else if (popupState === 'open' && !isVisibleProp) {
      setPopupState('closing')
    }
  }, [isVisibleProp, popupState])

  return isVisible ? (
    <PopupInternal
      ref={ref}
      popupState={popupState}
      setPopupState={setPopupState}
      {...props}
    />
  ) : null
})

export const PopupInternal = forwardRef<
  HTMLDivElement,
  PopupProps & {
    popupState: ModalState
    setPopupState: (value: SetStateAction<ModalState>) => void
  }
>(function Popup(
  props: PopupProps & {
    popupState: ModalState
    setPopupState: (value: SetStateAction<ModalState>) => void
  },
  ref: Ref<HTMLDivElement>
) {
  const {
    popupState,
    setPopupState,
    anchorRef,
    checkIfClickInside,
    children,
    className,
    isVisible: isVisibleProp,
    onAfterClose,
    onClose,
    anchorOrigin: anchorOriginProp = defaultAnchorOrigin,
    transformOrigin: transformOriginProp = defaultTransformOrigin,
    dismissOnMouseLeave,
    hideCloseButton = false,
    showHeader,
    title,
    zIndex,
    containerRef,
    portalLocation = document.body,
    shadow = 'mid',
    fixed,
    takeWidthOfAnchor
  } = props
  const { spring, shadows } = useTheme()

  const isVisible = popupState !== 'closed'

  const handleClose = useCallback(() => {
    onClose?.()
    setTimeout(() => {
      if (onAfterClose) {
        onAfterClose()
      }
    }, closingAnimationDuration)
  }, [onClose, onAfterClose])

  const [anchorOrigin, transformOrigin] = [
    anchorOriginProp,
    transformOriginProp
  ]

  const popupRef: React.MutableRefObject<HTMLDivElement> = useClickOutside(
    handleClose,
    checkIfClickInside,
    isVisible,
    typeof ref === 'function' ? undefined : ref
  )

  const wrapperRef = useRef<HTMLDivElement>(null)
  const originalTopPosition = useRef<number>(0)
  const [computedTransformOrigin, setComputedTransformOrigin] =
    useState(anchorOrigin)

  // On visible, set the position
  useEffect(() => {
    if (isVisible) {
      const [anchorRect, wrapperRect] = [anchorRef, wrapperRef].map((r) =>
        r?.current?.getBoundingClientRect()
      )
      if (!anchorRect || !wrapperRect) return

      const {
        anchorOrigin: anchorOriginComputed,
        transformOrigin: transformOriginComputed
      } = getComputedOrigins(
        anchorOrigin,
        transformOrigin,
        anchorRect,
        wrapperRect,
        portalLocation,
        containerRef
      )
      setComputedTransformOrigin(transformOriginComputed)

      const anchorTranslation = getOriginTranslation(
        anchorOriginComputed,
        anchorRect
      )
      const wrapperTranslation = getOriginTranslation(
        transformOriginComputed,
        wrapperRect
      )

      const top = anchorRect.y + anchorTranslation.y - wrapperTranslation.y
      const left = anchorRect.x + anchorTranslation.x - wrapperTranslation.x

      const { adjustedTop, adjustedLeft } = getAdjustedPosition(
        top,
        left,
        wrapperRect,
        portalLocation
      )

      if (wrapperRef.current) {
        wrapperRef.current.style.top = `${top + adjustedTop}px`
        wrapperRef.current.style.left = `${left + adjustedLeft}px`
      }

      originalTopPosition.current = top
    }
  }, [isVisible, wrapperRef, anchorRef, anchorOrigin, transformOrigin, setComputedTransformOrigin, originalTopPosition, portalLocation, containerRef])

  // Callback invoked on each scroll. Uses original top position to scroll with content.
  // Takes scrollParent to get the current scroll position as well as the intitial scroll position
  // when the popup became visible.
  const watchScroll = useCallback(
    (scrollParent: Element, initialScrollPosition: number) => {
      const scrollTop = scrollParent.scrollTop
      if (wrapperRef.current) {
        wrapperRef.current.style.top = `${
          originalTopPosition.current - scrollTop + initialScrollPosition
        }px`
      }
    },
    [wrapperRef, originalTopPosition]
  )

  // Set up scroll listeners
  useEffect(() => {
    if (isVisible && anchorRef.current) {
      const scrollParent = getScrollParent(anchorRef.current)
      if (!scrollParent) return

      const initialScrollPosition = scrollParent.scrollTop
      const listener = () => watchScroll(scrollParent, initialScrollPosition)
      scrollParent.addEventListener('scroll', listener)
      return () => {
        scrollParent.removeEventListener('scroll', listener)
      }
    }

    return () => {}
  }, [isVisible, watchScroll, anchorRef])

  // Set up key listeners
  useEffect(() => {
    if (isVisible) {
      const escapeListener = (e: KeyboardEvent) => {
        if (e.code === 'Escape') {
          handleClose()
        }
      }

      window.addEventListener('keydown', escapeListener)

      return () => window.removeEventListener('keydown', escapeListener)
    }
    return () => {}
  }, [isVisible, handleClose])

  useEffect(() => {
    if (popupState === 'closed' && isVisibleProp) {
    } else if (popupState === 'open' && !isVisibleProp) {
      anchorRef.current?.focus()
    }
  }, [anchorRef, isVisibleProp, popupState])

  const transitions = useTransition(isVisibleProp, null, {
    from: {
      transform: `scale(0)`,
      opacity: 0
    },
    enter: {
      transform: `scale(1)`,
      opacity: 1
    },
    leave: {
      transform: `scale(0)`,
      opacity: 0
    },
    config: spring.standard,
    unique: true,
    onDestroyed: (isDestroyed) => {
      setPopupState(isDestroyed ? 'closed' : 'open')
    }
  })

  const rootStyle = {
    zIndex,
    position: fixed ? ('fixed' as const) : undefined,
    width: takeWidthOfAnchor ? anchorRef.current?.clientWidth : undefined
  }

  const handleMouseLeave = useCallback(() => {
    if (dismissOnMouseLeave) {
      onClose?.()
    }
  }, [dismissOnMouseLeave, onClose])

  return (
    <>
      {/* Portal the popup out of the dom structure so that it has a separate stacking context */}
      {popupState !== 'closed'
        ? ReactDOM.createPortal(
            <div
              ref={wrapperRef}
              className={styles.root}
              style={rootStyle}
              onMouseLeave={handleMouseLeave}
            >
              {transitions.map(({ item, key, props }) =>
                item ? (
                  <animated.div
                    className={cn(styles.popup, className)}
                    css={{ boxShadow: shadows[shadow] }}
                    ref={popupRef}
                    key={key}
                    style={{
                      ...props,
                      transformOrigin: `${computedTransformOrigin.horizontal} ${computedTransformOrigin.vertical}`
                    }}
                  >
                    {showHeader && (
                      <div
                        className={cn(styles.header, {
                          [styles.noAfter]: hideCloseButton
                        })}
                      >
                        {hideCloseButton ? null : (
                          <PlainButton
                            variant='subdued'
                            aria-label={messages.close}
                            onClick={handleClose}
                            iconLeft={IconClose}
                          />
                        )}
                        <div className={styles.title}>{title}</div>
                      </div>
                    )}
                    {children}
                  </animated.div>
                ) : null
              )}
            </div>,
            portalLocation
          )
        : null}
    </>
  )
})
