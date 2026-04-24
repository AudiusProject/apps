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
import { usePrevious } from 'react-use'

import { PlainButton } from '~harmony/components/button/PlainButton/PlainButton'
import { IconClose } from '~harmony/icons'
import { ModalState } from '~harmony/utils/modalState'

import { useClickOutside } from '../../hooks/useClickOutside'
import { getScrollParent } from '../../utils/getScrollParent'

import styles from './Popup.module.css'
import type { PopupProps, Origin } from './types'
const animatedAny = animated as any

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

  const flipHorizontalOrigin = (horizontal: Origin['horizontal']) => {
    if (horizontal === 'left') return 'right'
    if (horizontal === 'right') return 'left'
    return horizontal
  }

  // Avoid mutating caller-provided origin objects across opens.
  const computedAnchorOrigin = { ...anchorOrigin }
  const computedTransformOrigin = { ...transformOrigin }

  let containerWidth, containerHeight
  if (containerRef && containerRef.current) {
    const containerRect = containerRef.current.getBoundingClientRect()
    containerWidth =
      containerRect.width + containerRect.x - CONTAINER_INSET_PADDING
    containerHeight =
      containerRect.height + containerRect.y - CONTAINER_INSET_PADDING
  } else {
    const portalRect = portal.getBoundingClientRect()
    containerWidth = portalRect.width + portalRect.x - CONTAINER_INSET_PADDING
    containerHeight = portalRect.height + portalRect.y - CONTAINER_INSET_PADDING
  }

  // Get new wrapper position
  const anchorTranslation = getOriginTranslation(
    computedAnchorOrigin,
    anchorRect
  )
  const wrapperTranslation = getOriginTranslation(
    computedTransformOrigin,
    wrapperRect
  )
  const wrapperX = anchorRect.x + anchorTranslation.x - wrapperTranslation.x
  const wrapperY = anchorRect.y + anchorTranslation.y - wrapperTranslation.y

  // Check bounds of the wrapper in new position are inside container
  const overflowRight = wrapperX + wrapperRect.width > containerWidth
  const overflowLeft = wrapperX < 0
  const overflowBottom = wrapperY + wrapperRect.height > containerHeight
  const overflowTop = wrapperY < 0

  // On horizontal overflow, mirror both origins so the popup flips direction
  // while remaining aligned to the trigger edge.
  if (overflowRight !== overflowLeft) {
    computedAnchorOrigin.horizontal = flipHorizontalOrigin(
      computedAnchorOrigin.horizontal
    )
    computedTransformOrigin.horizontal = flipHorizontalOrigin(
      computedTransformOrigin.horizontal
    )
  }
  if (overflowTop) {
    computedAnchorOrigin.vertical = 'bottom'
    computedTransformOrigin.vertical = 'top'
  }
  if (overflowBottom) {
    computedAnchorOrigin.vertical = 'top'
    computedTransformOrigin.vertical = 'bottom'
  }
  return {
    anchorOrigin: computedAnchorOrigin,
    transformOrigin: computedTransformOrigin
  }
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
    portalLocation: rawPortalLocation = document.body,
    shadow = 'mid',
    fixed,
    takeWidthOfAnchor,
    disableAutoFlip = false,
    disableDefaultStyles = false
  } = props
  const { spring, shadows } = useTheme()

  // Refs (e.g. mainContentRef.current) are often null on first render; default
  // only applies to undefined, so null must fall back to document.body.
  const portalLocation: HTMLElement =
    rawPortalLocation != null ? rawPortalLocation : document.body

  const isVisible = popupState !== 'closed'
  const previousIsVisible = usePrevious(isVisible)

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
    isVisible,
    checkIfClickInside,
    typeof ref === 'function' ? undefined : ref,
    anchorRef
  )

  const wrapperRef = useRef<HTMLDivElement>(null)
  const computedOriginsRef = useRef<{
    anchorOrigin: Origin
    transformOrigin: Origin
  } | null>(null)
  const [computedTransformOrigin, setComputedTransformOrigin] =
    useState(transformOrigin)

  const wrapperHeight = wrapperRef?.current?.offsetHeight ?? null
  const wrapperWidth = wrapperRef?.current?.offsetWidth ?? null
  const previousHeight = usePrevious(wrapperHeight)
  const previousWidth = usePrevious(wrapperWidth)
  const wrapperSizeChange =
    wrapperHeight !== previousHeight || wrapperWidth !== previousWidth

  useEffect(() => {
    if (!isVisibleProp) {
      computedOriginsRef.current = null
    }
  }, [isVisibleProp])

  const isAnchorVisible = useCallback(() => {
    const anchorRect = anchorRef.current?.getBoundingClientRect()
    if (!anchorRect) return false

    const isBodyPortal =
      typeof document !== 'undefined' && portalLocation === document.body
    if (isBodyPortal) {
      return (
        anchorRect.bottom > 0 &&
        anchorRect.top < window.innerHeight &&
        anchorRect.right > 0 &&
        anchorRect.left < window.innerWidth
      )
    }

    const portalRect = portalLocation.getBoundingClientRect()
    return (
      anchorRect.bottom > portalRect.top &&
      anchorRect.top < portalRect.bottom &&
      anchorRect.right > portalRect.left &&
      anchorRect.left < portalRect.right
    )
  }, [anchorRef, portalLocation])

  const updatePosition = useCallback(
    (recomputeOrigins = false) => {
      const [anchorRect, wrapperRect] = [anchorRef, wrapperRef].map((r) =>
        r?.current?.getBoundingClientRect()
      )
      if (!anchorRect || !wrapperRect) return

      if (recomputeOrigins || !computedOriginsRef.current) {
        computedOriginsRef.current = disableAutoFlip
          ? { anchorOrigin, transformOrigin }
          : getComputedOrigins(
              anchorOrigin,
              transformOrigin,
              anchorRect,
              wrapperRect,
              portalLocation,
              containerRef
            )
      }

      const {
        anchorOrigin: anchorOriginComputed,
        transformOrigin: transformOriginComputed
      } = computedOriginsRef.current

      setComputedTransformOrigin(transformOriginComputed)

      const anchorTranslation = getOriginTranslation(
        anchorOriginComputed,
        anchorRect
      )
      const wrapperTranslation = getOriginTranslation(
        transformOriginComputed,
        wrapperRect
      )

      const viewportTop =
        anchorRect.y + anchorTranslation.y - wrapperTranslation.y
      const viewportLeft =
        anchorRect.x + anchorTranslation.x - wrapperTranslation.x
      const isBodyPortal =
        typeof document !== 'undefined' && portalLocation === document.body

      let top = viewportTop
      let left = viewportLeft
      if (!isBodyPortal) {
        const portalRect = portalLocation.getBoundingClientRect()
        top = viewportTop - portalRect.top + portalLocation.scrollTop
        left = viewportLeft - portalRect.left + portalLocation.scrollLeft
      }

      if (!disableAutoFlip && isBodyPortal) {
        top = Math.min(
          Math.max(0, top),
          window.innerHeight - wrapperRect.height
        )
        left = Math.min(
          Math.max(0, left),
          window.innerWidth - wrapperRect.width
        )
      }

      if (wrapperRef.current) {
        wrapperRef.current.style.top = `${top}px`
        wrapperRef.current.style.left = `${left}px`
      }
    },
    [
      anchorRef,
      anchorOrigin,
      containerRef,
      disableAutoFlip,
      portalLocation,
      transformOrigin
    ]
  )

  // On visible, set the position
  useEffect(() => {
    if ((isVisible && !previousIsVisible) || wrapperSizeChange) {
      // Add a small delay to ensure content is rendered
      requestAnimationFrame(() => updatePosition(true))
    }
  }, [
    anchorRef,
    containerRef,
    disableAutoFlip,
    isVisible,
    previousIsVisible,
    portalLocation,
    setComputedTransformOrigin,
    transformOrigin,
    updatePosition,
    wrapperRef,
    wrapperSizeChange
  ])

  // Set up scroll listeners
  useEffect(() => {
    if (isVisible && anchorRef.current) {
      const scrollParent = getScrollParent(anchorRef.current)
      if (!scrollParent) return

      const isBodyPortal =
        typeof document !== 'undefined' && portalLocation === document.body

      let frame = 0
      const schedule = (shouldReposition: boolean) => {
        if (frame) return
        frame = requestAnimationFrame(() => {
          frame = 0
          if (!isAnchorVisible()) {
            handleClose()
            return
          }
          if (shouldReposition) {
            updatePosition()
          }
        })
      }

      const onScroll = () => {
        // For non-body portals the popup naturally scrolls with content;
        // only body portals need active repositioning.
        schedule(isBodyPortal)
      }
      const onResize = () => {
        // Keep the popup aligned on viewport changes without reflipping origins.
        schedule(true)
      }

      scrollParent.addEventListener('scroll', onScroll)
      window.addEventListener('resize', onResize)
      return () => {
        scrollParent.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        if (frame) {
          cancelAnimationFrame(frame)
        }
      }
    }

    return () => {}
  }, [
    anchorRef,
    handleClose,
    isAnchorVisible,
    isVisible,
    portalLocation,
    updatePosition
  ])

  // Set up key listeners
  useEffect(() => {
    if (isVisible) {
      const escapeListener = (e: KeyboardEvent) => {
        if (e.code === 'Escape') {
          e.stopPropagation()
          handleClose()
        }
      }

      document.addEventListener('keydown', escapeListener, true)

      return () => document.removeEventListener('keydown', escapeListener, true)
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
    onDestroyed: (isDestroyed: boolean) => {
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
              {transitions.map(({ item, key, props }: any) => {
                if (!item) return null
                const AnimatedDiv = animatedAny.div as any
                return (
                  <AnimatedDiv
                    className={cn(
                      {
                        [styles.popup]: !disableDefaultStyles
                      },
                      className
                    )}
                    css={
                      disableDefaultStyles
                        ? undefined
                        : { boxShadow: shadows[shadow] }
                    }
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
                  </AnimatedDiv>
                )
              })}
            </div>,
            portalLocation
          )
        : null}
    </>
  )
})
