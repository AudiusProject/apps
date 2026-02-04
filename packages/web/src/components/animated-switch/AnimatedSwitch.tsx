import {
  useContext,
  useEffect,
  ReactNode,
  useRef,
  useState,
  CSSProperties,
  useMemo
} from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { route } from '@audius/common/utils'
import { Routes, useLocation } from 'react-router'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useTransition, animated } from 'react-spring'

import { getIsIOS } from 'utils/browser'
import { getPathname } from 'utils/route'

import { RouterContext, SlideDirection } from './RouterContextProvider'
const animatedAny = animated as any
const {
  SIGN_IN_PAGE,
  SIGN_UP_PAGE,
  NOTIFICATION_PAGE,
  FEED_PAGE,
  TRENDING_PAGE,
  EXPLORE_PAGE,
  LIBRARY_PAGE
} = route

const DISABLED_PAGES = new Set([
  SIGN_IN_PAGE,
  SIGN_UP_PAGE,
  FEED_PAGE,
  TRENDING_PAGE,
  EXPLORE_PAGE,
  LIBRARY_PAGE
])

if (!getIsIOS()) {
  DISABLED_PAGES.add(NOTIFICATION_PAGE)
}

const wobble = {
  mass: 1,
  tension: 350,
  friction: 25,
  clamp: true
}

const slideInLeftTransition = {
  from: { opacity: 1, transform: 'translate3d(100%,0,0)' },
  enter: { opacity: 1, transform: 'translate3d(0,0,0)' },
  leave: { opacity: 0, transform: 'translate3d(-80%,0,0)' },
  config: wobble,
  immediate: false
}

const slideInRightTransition = {
  from: { opacity: 1, transform: 'translate3d(-100%,0,0)' },
  enter: { opacity: 1, transform: 'translate3d(0,0,0)' },
  leave: { opacity: 0, transform: 'translate3d(80%,0,0)' },
  config: wobble,
  immediate: false
}

const noTransition = {
  from: { opacity: 1, transform: 'translate3d(0,0,0)' },
  enter: { opacity: 1, transform: 'translate3d(0,0,0)' },
  leave: { opacity: 1, transform: 'translate3d(0,0,0)' },
  config: wobble,
  immediate: true
}

type AnimatedSwitchProps = {
  children: ReactNode
  handle: string | null
  isInitialPage: boolean
}

const AnimatedSwitch = ({
  children,
  handle,
  isInitialPage
}: AnimatedSwitchProps) => {
  const { stackReset, setStackReset, slideDirection } =
    useContext(RouterContext)
  const animationRef = useRef<HTMLDivElement>(null)
  const [disabled, setDisabled] = useState(false)

  const location = useLocation()
  const pathname = getPathname(location)

  const [getAnimation, setAnimation] = useInstanceVar(noTransition)
  // Maintain an instance var to track whether the navigation stack is reset (no animations)
  // so that `window.onpopstate` can know whether or not to set animations
  const [getIsStackResetting, setIsStackResetting] = useInstanceVar(false)

  // Track last pathname to prevent duplicate animation setup
  const lastPathnameRef = useRef(pathname)
  // Use state for stable pathname so useMemo can track changes
  const [stablePathname, setStablePathname] = useState(pathname)

  // Handle pathname changes
  useEffect(() => {
    // If pathname hasn't actually changed, don't do anything
    if (pathname === stablePathname) {
      return
    }

    // Check if navigating between bottom bar pages - if so, use noTransition and update immediately
    // DISABLED_PAGES already includes FEED_PAGE, TRENDING_PAGE, EXPLORE_PAGE, LIBRARY_PAGE
    const isNavigatingBetweenBottomBarPages =
      DISABLED_PAGES.has(pathname) &&
      DISABLED_PAGES.has(lastPathnameRef.current)

    // Update stablePathname immediately
    setStablePathname(pathname)
    lastPathnameRef.current = pathname

    // For bottom bar pages, use noTransition (instant)
    if (isNavigatingBetweenBottomBarPages) {
      setAnimation(noTransition)
      setIsStackResetting(false)
      return
    }

    // For other pages, use slide animation
    const animation =
      slideDirection === SlideDirection.FROM_LEFT
        ? slideInLeftTransition
        : slideInRightTransition
    setAnimation(animation)
    setIsStackResetting(false)
  }, [
    pathname,
    stablePathname,
    setAnimation,
    slideDirection,
    setIsStackResetting
  ])

  // Reset
  useEffect(() => {
    if (stackReset) {
      setIsStackResetting(true)
      setAnimation(noTransition)
      setStackReset(false)
    }
  }, [stackReset, setStackReset, setAnimation, setIsStackResetting])

  // Go back a page
  useEffect(() => {
    window.onpopstate = (e: any) => {
      if (!getIsStackResetting()) {
        setAnimation(
          slideDirection === SlideDirection.FROM_LEFT
            ? slideInRightTransition
            : slideInLeftTransition
        )
      } else {
        setAnimation(noTransition)
      }
    }
  }, [setAnimation, slideDirection, getIsStackResetting])

  useEffect(() => {
    if (
      DISABLED_PAGES.has(getPathname(location)) ||
      // Don't animate on replace transitions (v6 doesn't expose action directly)
      // We'll handle this via location state if needed
      // @ts-ignore
      location.state?.noAnimation
    ) {
      setDisabled(true)
    } else if (disabled) {
      setDisabled(false)
    }
  }, [location, disabled, setDisabled])

  // Use stable pathname to prevent rapid transition creation
  // For bottom bar pages, stablePathname updates immediately, so this should be in sync
  const transitionItems = useMemo(() => [stablePathname], [stablePathname])

  const transitions = useTransition(
    transitionItems,
    (item) => item,
    getAnimation()
  )

  const extraStyles: CSSProperties = {}
  if (disabled) {
    extraStyles.transform = 'none'
  }

  return (
    <>
      {transitions.map(({ item, props, state, key }) => {
        if (stackReset && state === 'leave') {
          return null
        }
        const transitionProps = stackReset ? {} : props
        // Render Routes for the current pathname (item) to ensure immediate rendering
        const itemPathname = item
        return (
          <animatedAny.div
            ref={animationRef}
            style={{
              ...transitionProps,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              ...extraStyles
            }}
            key={key}
          >
            {/* Only render if this transition item matches the current pathname */}
            {itemPathname === pathname && (
              <Routes location={location}>{children}</Routes>
            )}
          </animatedAny.div>
        )
      })}
    </>
  )
}

export default AnimatedSwitch
