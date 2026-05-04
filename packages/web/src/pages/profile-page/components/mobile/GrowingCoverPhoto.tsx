import { useEffect, useCallback } from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { Image, type ImageProps } from '@audius/harmony'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

const animatedAny = animated as any

type GrowingCoverPhotoProps = ImageProps & {
  /** When true, renders a frosted-glass overlay on top of the image. */
  useBlur?: boolean
}

// Scale the image by making it larger relative to y-pos and translate it up slightly (capping at -15px) so it
// covers the gap made by overscroll.
const interpTransform = (y: number) =>
  `scale(${1 + Math.abs(y) / 60.0}) translate3d(0, ${Math.max(
    y / 2,
    -15
  )}px, 0)`
// Blur and dim the image, maxing out blur at 8px and dim at 0.5.
const interpFilter = (y: number) =>
  `blur(${Math.min(0.0 + Math.abs(y) / 5.0, 8)}px) brightness(${Math.max(
    1.0 - Math.abs(y) / 30.0,
    0.5
  )})`

const springConfig = {
  mass: 1,
  tension: 160,
  friction: 20
}

const messages = {
  coverArtAltText: 'User Cover Art'
}

/**
 * A cover photo for mobile that grows as the user overflow-scrolls upward.
 * Wraps Harmony Image in a parallax-style animated container, with an
 * optional blur overlay for fallback (placeholder) cover photos.
 */
const GrowingCoverPhoto = ({
  children,
  useBlur,
  ...rest
}: GrowingCoverPhotoProps) => {
  const [getShouldTrackScroll, setShouldTrackScroll] = useInstanceVar(false)
  const [springProps, setSpringProps] = useSpring(() => ({
    to: {
      y: 0
    },
    config: springConfig,
    immediate: true,
    onRest: () => {}
  }))

  const handleScrollEvent = useCallback(() => {
    if (getShouldTrackScroll()) {
      const scrollY = window.scrollY
      if (scrollY <= 0) {
        setSpringProps({
          to: {
            y: scrollY
          },
          config: springConfig,
          immediate: true,
          onRest: () => {}
        })
      }
    }
  }, [setSpringProps, getShouldTrackScroll])

  // The cover photo tracks the users scrolling most of the time, except
  // when they release their finger, we just rely on the spring to reset
  // the grown photo.
  const handleReset = useCallback(() => {
    if (window.scrollY <= 0) {
      setSpringProps({
        to: {
          y: 0
        },
        config: {
          ...springConfig,
          // Base the tension back in off of the scroll Y offset, this heuristic
          // feels ok and is more performant than tracking the Y scroll back down.
          tension: (Math.max(Math.abs(window.scrollY) + 10), 60) * 2,
          clamp: true
        },
        immediate: false,
        onRest: () => {
          setShouldTrackScroll(true)
        }
      })
      setImmediate(() => setShouldTrackScroll(false))
    }
  }, [setSpringProps, setShouldTrackScroll])

  const handleTouch = useCallback(() => {
    setShouldTrackScroll(true)
  }, [setShouldTrackScroll])

  useEffect(() => {
    window.addEventListener('scroll', handleScrollEvent)
    window.addEventListener('touchend', handleReset, false)
    window.addEventListener('touchmove', handleTouch, false)
    return () => {
      window.removeEventListener('scroll', handleScrollEvent)
      window.removeEventListener('touchend', handleReset)
      window.removeEventListener('touchmove', handleTouch)
    }
  }, [handleScrollEvent, handleReset, handleTouch])

  return (
    <animatedAny.div
      style={{
        zIndex: 3,
        overflowX: 'hidden',
        transformOrigin: 'center center',
        // @ts-ignore
        filter: springProps.y.interpolate(interpFilter),
        // @ts-ignore
        transform: springProps.y.interpolate(interpTransform)
      }}
    >
      <Image alt={messages.coverArtAltText} {...rest}>
        {useBlur ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(25px)',
              zIndex: 3
            }}
          />
        ) : null}
        {children}
      </Image>
    </animatedAny.div>
  )
}

export default GrowingCoverPhoto
