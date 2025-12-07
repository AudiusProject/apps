import { useEffect, useCallback } from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { nowPlayingUIActions } from '@audius/common/store'
import { IconAudiusLogoHorizontal } from '@audius/harmony'
import { useDispatch } from 'react-redux'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'
import { useDrag } from 'react-use-gesture'

import ConnectedBottomBar from 'components/nav/mobile/ConnectedBottomBar'
import MobilePlayBar from 'components/play-bar/mobile/PlayBar'

import NowPlaying from './NowPlaying'
import styles from './NowPlayingDrawer.module.css'
const animatedAny = animated as any
const { setIsOpen: _setIsNowPlayingOpen } = nowPlayingUIActions

const DEFAULT_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 0

// Translation values for a totally hidden drawer
const DRAWER_HIDDEN_TRANSLATION = -48
// Translation values for the play bar stub
const STUB_HIDDEN_TRANSLATION = -96 // 20 //-96

// Translations for the bottom bar
const BOTTOM_BAR_INITIAL_TRANSLATION = 0
const BOTTOM_BAR_HIDDEN_TRANSLATION = 80

// Fraction of swipe up to fade (1 / FADE_FRACTION_DENOMINATOR)
const FADE_FRACTION_DENOMINATOR = 4
const FADE_IN_MULTIPLIER = 1.5

// Cut off where an open is considered an open
const OPEN_CUTOFF = 0.2
// Cut off where a close is considered a close
const CLOSE_CUTOFF = 0.7
// Cut off where velocity trumps open/close cut offs
const VELOCITY_CUTOFF = 0.5

// Controls the amount of friction in swiping when overflowing up or down
const OVERFLOW_FRICTION = 4

const wobble = {
  mass: 1,
  tension: 250,
  friction: 25
}
const stiff = {
  mass: 1,
  tension: 215,
  friction: 40
}

const fast = {
  mass: 1,
  tension: 300,
  friction: 40
}

// Interpolates a single y-value into a string translate3d
const interpY = (y: number) => `translate3d(0, ${y}px, 0)`

type NowPlayingDrawerProps = {
  isPlaying: boolean
  shouldClose: boolean
}

/**
 * A drawer-like component that houses the now playing menu,
 * play bar, and bottom bar for the mobile UI.
 * When the drawer is dragged up, the play bar fades into a header
 * and then bottom bar animates away.
 * When the drawer is dragged down, the reverse happens.
 */
const NowPlayingDrawer = ({
  isPlaying,
  shouldClose
}: NowPlayingDrawerProps) => {
  const dispatch = useDispatch()
  const setIsNowPlayingOpen = useCallback(
    (isOpen: boolean) => dispatch(_setIsNowPlayingOpen({ isOpen })),
    [dispatch]
  )
  // Stores the initial translation of the drawer (it's totally off-screen
  // until something is playing)
  const [initialTranslation, setInitialTranslation] = useInstanceVar(
    DRAWER_HIDDEN_TRANSLATION
  )
  // Stores the last transition
  const [currentTranslation, setCurrentTranslation] = useInstanceVar(
    DRAWER_HIDDEN_TRANSLATION
  )
  // Stores the height (as the window.innerHeight can change)
  const [height, setHeight] = useInstanceVar(DEFAULT_HEIGHT)
  // Stores whether or not the now playing drawer is "open"
  const [isOpen, setIsOpen] = useInstanceVar(false)

  const [drawerSlideProps, setDrawerSlideProps] = useSpring(() => ({
    to: {
      y: initialTranslation()
    },
    config: wobble,
    immediate: true,
    onFrame(frame: any) {
      setCurrentTranslation(frame.y)
    }
  }))
  const [headerFadeProps, setHeaderFadeProps] = useSpring(() => ({
    to: {
      opacity: 0
    },
    config: stiff
  }))
  const [playBarFadeProps, setPlayBarFadeProps] = useSpring(() => ({
    to: {
      opacity: 1
    },
    config: stiff
  }))

  const [bottomBarSlideProps, setBottomBarSlideProps] = useSpring(() => ({
    to: {
      y: BOTTOM_BAR_INITIAL_TRANSLATION
    },
    config: stiff
  }))

  useEffect(() => {
    if (isPlaying && !isOpen()) {
      setInitialTranslation(STUB_HIDDEN_TRANSLATION)
      setDrawerSlideProps({
        to: {
          y: initialTranslation()
        },
        config: wobble
      })
    } else if (!isPlaying) {
      setIsOpen(false)
      setIsNowPlayingOpen(false)
      setInitialTranslation(0)
      setDrawerSlideProps({
        to: {
          y: initialTranslation()
        },
        config: wobble
      })
    }
  }, [
    isPlaying,
    setDrawerSlideProps,
    initialTranslation,
    setInitialTranslation,
    setIsOpen,
    setIsNowPlayingOpen,
    isOpen
  ])

  useEffect(() => {
    window.onresize = () => {
      // const diff = Math.abs(height - window.innerHeight)
      const drawer = document.getElementById('now-playing-drawer')
      if (drawer) {
        const h = window.innerHeight
        setHeight(h)
        // @ts-ignore
        drawer.style.height = `${h}px`
        // @ts-ignore
        drawer.style.bottom = `-${h}px`
      }
    }
    // @ts-ignore
    window.onresize()
  }, [setHeight])

  const open = () => {
    setIsOpen(true)
    setIsNowPlayingOpen(true)
    setDrawerSlideProps({
      to: {
        y: -1 * height()
      },
      immediate: false,
      config: wobble
    })
    setHeaderFadeProps({
      to: {
        opacity: 1
      },
      immediate: false
    })
    setPlayBarFadeProps({
      to: {
        opacity: 0
      },
      immediate: true
    })
    setBottomBarSlideProps({
      to: {
        y: BOTTOM_BAR_HIDDEN_TRANSLATION
      },
      immediate: false,
      config: stiff
    })
  }

  const close = useCallback(() => {
    setIsNowPlayingOpen(false)
    setDrawerSlideProps({
      to: {
        y: initialTranslation()
      },
      immediate: false,
      config: wobble
    })
    setHeaderFadeProps({
      to: {
        opacity: 0
      },
      immediate: false,
      config: stiff
    })
    setPlayBarFadeProps({
      to: {
        opacity: 1
      },
      immediate: false,
      config: stiff
    })
    setBottomBarSlideProps({
      to: {
        y: BOTTOM_BAR_INITIAL_TRANSLATION
      },
      immediate: false,
      config: stiff
    })
  }, [
    initialTranslation,
    setDrawerSlideProps,
    setHeaderFadeProps,
    setPlayBarFadeProps,
    setBottomBarSlideProps,
    setIsNowPlayingOpen
  ])

  // Handle the "controlled" component
  useEffect(() => {
    if (shouldClose) {
      close()
    }
  }, [shouldClose, close])

  useEffect(() => {
    const bottomBarY = BOTTOM_BAR_INITIAL_TRANSLATION
    const drawerY = initialTranslation()

    setBottomBarSlideProps({
      to: {
        y: bottomBarY
      },
      immediate: false,
      config: fast
    })

    setDrawerSlideProps({
      to: {
        y: drawerY
      },
      immediate: false,
      config: fast
    })
  }, [setBottomBarSlideProps, setDrawerSlideProps, initialTranslation])

  const bind = useDrag(
    ({
      last,
      first,
      vxvy: [, vy],
      movement: [, my],
      memo = currentTranslation()
    }) => {
      let newY = memo + my

      // Overflow dragging up: the height of the drawer drag is > window height
      // Add friction
      const topOverflow = Math.abs(newY) - height()
      if (topOverflow > 0) {
        newY = -1 * height() - topOverflow / OVERFLOW_FRICTION
      }

      // Overflow dragging down: the height of the drawer < playbar height
      // Add friction
      const bottomOverflow = newY - STUB_HIDDEN_TRANSLATION
      if (bottomOverflow > 0) {
        newY = STUB_HIDDEN_TRANSLATION + bottomOverflow / OVERFLOW_FRICTION
      }

      if (last) {
        // If this is the last touch event, potentially open or close the drawer
        if (vy === 0) {
          if (Math.abs(newY) > height() * OPEN_CUTOFF) {
            open()
          } else {
            close()
          }
          // Click, do nothing
        } else if (vy < 0) {
          // swipe up
          if (
            Math.abs(newY) > height() * OPEN_CUTOFF ||
            Math.abs(vy) > VELOCITY_CUTOFF
          ) {
            open()
          } else {
            close()
          }
        } else {
          // swipe down
          if (
            Math.abs(newY) < height() * CLOSE_CUTOFF ||
            vy > VELOCITY_CUTOFF
          ) {
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
        setHeaderFadeProps({
          to: {
            // Start fading the header in 1/4th of the height and complete
            // fading it in at 2/3rds of the height
            opacity: Math.min(
              1,
              (Math.abs(newY) - height() / FADE_FRACTION_DENOMINATOR) /
                (height() / FADE_IN_MULTIPLIER)
            )
          },
          immediate: true,
          config: stiff
        })
        setPlayBarFadeProps({
          to: {
            // Animate from opacity 1 to 0 at 1/4th the height
            opacity: Math.max(
              0,
              1 - Math.abs(newY / (height() / FADE_FRACTION_DENOMINATOR))
            )
          },
          immediate: true,
          config: stiff
        })
        setBottomBarSlideProps({
          to: {
            y: (Math.abs(newY) / height()) * BOTTOM_BAR_HIDDEN_TRANSLATION
          },
          immediate: true,
          config: stiff
        })
      }
      return memo
    }
  )

  return (
    <>
      <animatedAny.div
        className={styles.drawer}
        id='now-playing-drawer'
        {...bind()}
        style={{
          visibility: isPlaying ? 'visible' : 'hidden',
          bottom: `-${DEFAULT_HEIGHT}px`,
          // @ts-ignore
          transform: drawerSlideProps.y.interpolate(interpY)
        }}
      >
        <animatedAny.div className={styles.header} style={headerFadeProps}>
          <IconAudiusLogoHorizontal color='subdued' sizeH='l' width='auto' />
        </animatedAny.div>

        <animatedAny.div className={styles.playBar} style={playBarFadeProps}>
          <MobilePlayBar onClickInfo={open} />
        </animatedAny.div>

        <div className={styles.nowPlaying}>
          <NowPlaying onClose={close} />
        </div>
        {/* "Bottom padding" so over drags upwards of the drawer are white */}
        <div className={styles.skirt} />
      </animatedAny.div>

      <animatedAny.div
        className={styles.bottomBar}
        // @ts-ignore
        style={{ transform: bottomBarSlideProps.y.interpolate(interpY) }}
      >
        <ConnectedBottomBar />
      </animatedAny.div>
    </>
  )
}

export default NowPlayingDrawer
