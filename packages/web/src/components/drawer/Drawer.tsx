import { useEffect, useCallback, useRef, ReactNode, useState } from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { IconClose } from '@audius/harmony'
import { disableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock'
import cn from 'classnames'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated, useTransition } from 'react-spring'
import { useMeasure } from 'react-use'
import { useDrag } from 'react-use-gesture'

import { usePortal } from 'hooks/usePortal'

import styles from './Drawer.module.css'
const animatedAny = animated as any

// Fraction of swipe up to fade (1 / FADE_FRACTION_DENOMINATOR)
const FADE_FRACTION_DENOMINATOR = 2

// Cut off where an open is considered an open
const OPEN_CUTOFF = 0.2
// Cut off where a close is considered a close
const CLOSE_CUTOFF = 0.7
// Cut off where velocity trumps open/close cut offs
const VELOCITY_CUTOFF = 0.5

// Controls the amount of friction in swiping when overflowing up or down
const OVERFLOW_FRICTION = 4

// The opacity of the background when the drawer is open
const BACKGROUND_OPACITY = 0.5

const wobble = {
  mass: 1,
  tension: 250,
  friction: 25
}
const slowWobble = {
  mass: 1,
  tension: 175,
  friction: 20
}
const stiff = {
  mass: 1,
  tension: 215,
  friction: 40
}

// Interpolates a single y-value into a string translate3d
const interpY = (y: number) => `translate3d(0, ${y}px, 0)`

export type DrawerProps = {
  isOpen: boolean
  children: ReactNode
  shouldClose?: boolean
  onClose?: () => void
  onClosed?: () => void
  isFullscreen?: boolean
  zIndex?: number
  'aria-labelledby'?: string
}

const DraggableDrawer = ({
  isOpen,
  children,
  shouldClose,
  onClose,
  zIndex,
  'aria-labelledby': ariaLabelledBy
}: DrawerProps) => {
  const Portal = usePortal({})

  // Stores the initial translation of the drawer
  const [initialTranslation] = useInstanceVar(0)
  // Stores the last transition
  const [currentTranslation, setCurrentTranslation] = useInstanceVar(0)
  // isBackgroundVisible will be true until the close animation finishes
  const [isBackgroundVisible, setIsBackgroundVisible] = useState(false)

  const [contentRef, { height: contentHeight }] = useMeasure<HTMLDivElement>()

  const [drawerSlideProps, setDrawerSlideProps] = useSpring(() => ({
    to: {
      y: -1 * contentHeight
    },
    config: wobble,
    onFrame(frame: any) {
      setCurrentTranslation(frame.y)
    }
  }))

  const [contentFadeProps, setContentFadeProps] = useSpring(() => ({
    to: {
      opacity: 1
    },
    config: stiff
  }))

  const [backgroundOpacityProps, setBackgroundOpacityProps] = useSpring(() => ({
    to: {
      opacity: 0
    },
    config: stiff
  }))

  const open = useCallback(() => {
    setIsBackgroundVisible(true)
    setDrawerSlideProps({
      to: {
        y: -1 * contentHeight
      },
      immediate: false,
      config: wobble,
      onRest: () => {}
    })
    setContentFadeProps({
      to: {
        opacity: 1
      },
      immediate: false,
      config: stiff
    })
    setBackgroundOpacityProps({
      to: {
        opacity: BACKGROUND_OPACITY
      },
      immediate: false,
      config: stiff
    })
  }, [
    setDrawerSlideProps,
    contentHeight,
    setContentFadeProps,
    setBackgroundOpacityProps
  ])

  const close = useCallback(() => {
    setDrawerSlideProps({
      to: {
        y: initialTranslation()
      },
      immediate: false,
      config: wobble,
      onRest: () => setIsBackgroundVisible(false)
    })
    setContentFadeProps({
      to: {
        opacity: 1
      },
      immediate: false,
      config: stiff
    })
    setBackgroundOpacityProps({
      to: {
        opacity: 0
      },
      immediate: false,
      config: stiff
    })
    if (onClose) onClose()
  }, [
    initialTranslation,
    setDrawerSlideProps,
    setContentFadeProps,
    setBackgroundOpacityProps,
    onClose
  ])

  // Handle the "controlled" component
  useEffect(() => {
    if (isOpen) {
      // Ensure that our drawer knows the height of its inner contents
      setImmediate(open)
    }
  }, [open, isOpen])

  useEffect(() => {
    if (shouldClose) {
      close()
    }
  }, [shouldClose, close])

  const bind = useDrag(
    ({
      last,
      first,
      vxvy: [, vy],
      movement: [, my],
      memo = currentTranslation()
    }) => {
      const height = contentHeight

      let newY = memo + my

      // Overflow dragging up: the height of the drawer drag is > window height
      // Add friction
      const topOverflow = Math.abs(newY) - height
      if (topOverflow > 0) {
        newY = -1 * height - topOverflow / OVERFLOW_FRICTION
      }

      // Overflow dragging down: the height of the drawer < playbar height
      // Add friction
      const bottomOverflow = newY
      if (bottomOverflow > 0) {
        newY = bottomOverflow / OVERFLOW_FRICTION
      }

      if (last) {
        // If this is the last touch event, potentially open or close the drawer
        if (vy === 0) {
          if (Math.abs(newY) > height * OPEN_CUTOFF) {
            open()
          } else {
            close()
          }
          // Click, do nothing
        } else if (vy < 0) {
          // swipe up
          if (
            Math.abs(newY) > height * OPEN_CUTOFF ||
            Math.abs(vy) > VELOCITY_CUTOFF
          ) {
            open()
          } else {
            close()
          }
        } else {
          // swipe down
          if (Math.abs(newY) < height * CLOSE_CUTOFF || vy > VELOCITY_CUTOFF) {
            close()
          } else {
            open()
          }
        }
      } else if (!first) {
        // Otherwise track the touch events with the drawer
        setDrawerSlideProps({
          to: {
            y: newY
          },
          immediate: true,
          config: stiff
        })
        let newFade
        if (Math.abs(newY) > height / FADE_FRACTION_DENOMINATOR) {
          newFade = 1
        } else {
          newFade =
            1 -
            (height / FADE_FRACTION_DENOMINATOR - Math.abs(newY)) /
              (height / FADE_FRACTION_DENOMINATOR)
        }
        setContentFadeProps({
          to: {
            // Animate from opacity 1 to 0 at 1/FADE_FRACTION_DENOMINATOR the height
            opacity: Math.max(0, newFade)
          },
          immediate: true,
          config: stiff
        })

        const percentOpen = Math.abs(newY) / height
        const newOpacity = BACKGROUND_OPACITY * percentOpen

        setBackgroundOpacityProps({
          to: {
            opacity: newOpacity
          },
          immediate: true,
          config: stiff
        })
      }
      return memo
    }
  )

  return (
    <Portal>
      <animatedAny.div
        role='dialog'
        aria-labelledby={ariaLabelledBy}
        className={cn(styles.drawer, { [styles.isOpen]: isOpen })}
        {...bind()}
        style={{
          // @ts-ignore
          transform: drawerSlideProps.y.interpolate(interpY),
          zIndex
        }}
      >
        <animatedAny.div className={styles.playBar} style={contentFadeProps}>
          <div ref={contentRef}>{children}</div>
        </animatedAny.div>
        {/* "Bottom padding" so over drags upwards of the drawer are white */}
        <div className={styles.skirt} />
      </animatedAny.div>
      {/* Display transparent BG to block clicks behind drawer */}
      {isBackgroundVisible && (
        <animatedAny.div
          onClick={close}
          className={styles.background}
          style={{
            ...backgroundOpacityProps,
            ...(isOpen ? {} : { pointerEvents: 'none' }),
            zIndex: zIndex ? zIndex - 1 : undefined
          }}
        />
      )}
    </Portal>
  )
}

const interpolateBorderRadius = (r: number) => {
  // multiply R by some constant and then clamp so that for the majority
  // of the transition, it stays at it's initial value
  const r2 = Math.max(Math.min(r * 10, 40), 0)
  return `${r2}px ${r2}px 0px 0px`
}

const FullscreenDrawer = ({
  children,
  isOpen,
  zIndex,
  onClose,
  onClosed,
  'aria-labelledby': ariaLabelledBy
}: DrawerProps) => {
  const drawerRef = useRef<HTMLDivElement | null>(null)
  // Lock to prevent double scrollbars
  useEffect(() => {
    setImmediate(() => {
      if (drawerRef.current && isOpen) {
        disableBodyScroll(drawerRef.current)
      }
    })
    return () => {
      clearAllBodyScrollLocks()
    }
  }, [isOpen])

  const Portal = usePortal({})
  // @ts-ignore
  const transitions = useTransition(isOpen, null, {
    from: {
      y: 1,
      borderRadius: 40
    },
    enter: {
      y: 0,
      borderRadius: 0
    },
    leave: {
      y: 1,
      borderRadius: 40
    },
    config: slowWobble,
    onDestroyed: () => {
      if (!isOpen && onClosed) {
        onClosed()
      }
    }
  })
  return (
    <Portal>
      {transitions.map(
        // @ts-ignore
        ({ item, props, key }) =>
          // @ts-ignore
          item && (
            <animatedAny.div
              role='dialog'
              aria-labelledby={ariaLabelledBy}
              ref={drawerRef}
              className={cn(styles.drawer, styles.fullDrawer)}
              key={key}
              style={{
                // @ts-ignore
                transform: props.y.interpolate((y) =>
                  interpY(window.innerHeight * y)
                ),
                borderRadius: props.borderRadius?.interpolate(
                  // @ts-ignore
                  interpolateBorderRadius
                ),
                zIndex
              }}
            >
              <div className={styles.dismissContainer} onClick={onClose}>
                <IconClose size='s' />
              </div>
              {children}
            </animatedAny.div>
          )
      )}
    </Portal>
  )
}

const Drawer = (props: DrawerProps) => {
  return props.isFullscreen ? (
    <FullscreenDrawer {...props} />
  ) : (
    <DraggableDrawer {...props} />
  )
}

export default Drawer
