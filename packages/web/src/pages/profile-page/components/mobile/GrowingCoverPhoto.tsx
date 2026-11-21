import { useEffect, useCallback } from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { Image, type ImageProps } from '@audius/harmony'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

const animatedAny = animated as any

type GrowingCoverPhotoProps = ImageProps & {
  useBlur?: boolean
}

const interpTransform = (y: number) =>
  `scale(${1 + Math.abs(y) / 60.0}) translate3d(0, ${Math.max(
    y / 2,
    -15
  )}px, 0)`
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

  const handleReset = useCallback(() => {
    if (window.scrollY <= 0) {
      setSpringProps({
        to: {
          y: 0
        },
        config: {
          ...springConfig,
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
