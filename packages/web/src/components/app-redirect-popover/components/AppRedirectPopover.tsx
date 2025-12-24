import { Fragment, useState, useEffect } from 'react'

import { route } from '@audius/common/utils'
import { Button } from '@audius/harmony'
import { matchPath, useLocation } from 'react-router'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { animated, useTransition } from 'react-spring'
import { useSessionStorage } from 'react-use'

import AppIcon from 'assets/img/appIcon240.png'
import { useIsMobile } from 'hooks/useIsMobile'
import { getPathname } from 'utils/route'

import styles from './AppRedirectPopover.module.css'
const animatedAny = animated as any

const { APP_REDIRECT, SIGN_UP_PAGE } = route

const messages = {
  openInApp: 'Open in Audius App',
  notNow: 'Not Now'
}

const springConfigFast = {
  mass: 1,
  tension: 275,
  friction: 35
}

const springConfigSlow = {
  mass: 1,
  tension: 200,
  friction: 35
}

const springProps = {
  drawer: {
    from: {
      opacity: 0.6,
      transform: 'translateY(304px)'
    },
    enter: {
      opacity: 1,
      transform: 'translateY(0)'
    },
    leave: {
      opacity: 1,
      transform: 'translateY(304px)'
    },
    config: springConfigFast
  },
  element: {
    from: {
      transform: 'scale(0.5)',
      opacity: 1
    },
    enter: {
      transform: 'scale(1)',
      opacity: 1
    },
    leave: {
      transform: 'scale(1)',
      opacity: 1
    },
    config: springConfigSlow
  },
  background: {
    from: {
      opacity: 0
    },
    enter: {
      opacity: 1
    },
    leave: {
      opacity: 0
    }
  }
}

type AppRedirectPopoverProps = {
  incrementScroll: () => void
  decrementScroll: () => void
  onBeforeClickApp?: () => void
  onBeforeClickDismissed?: () => void
}

/**
 * Popover that presents an option to open the current
 * page in the mobile app, or redirects to the app store
 * if no app is installed.
 */
export const AppRedirectPopover = (props: AppRedirectPopoverProps) => {
  const {
    incrementScroll,
    decrementScroll,
    onBeforeClickApp = () => {},
    onBeforeClickDismissed = () => {}
  } = props
  const location = useLocation()
  const isMobile = useIsMobile()
  const [isDismissed, setIsDismissed] = useSessionStorage(
    'app-redirect-popover',
    false
  )

  const [animDelay, setAnimDelay] = useState(false)
  useEffect(() => {
    setTimeout(() => setAnimDelay(true), 1000)
  }, [])

  const shouldShow =
    !(matchPath('/', location.pathname)?.pathname === location.pathname) &&
    animDelay &&
    !isDismissed &&
    isMobile

  useEffect(() => {
    shouldShow && incrementScroll()
  }, [incrementScroll, shouldShow])

  const backgroundTransitions = useTransition(
    shouldShow,
    null,
    springProps.background
  )
  const elementTransitions = useTransition(
    shouldShow,
    null,
    springProps.element
  )
  const drawerTransitions = useTransition(shouldShow, null, springProps.drawer)

  const onClick = () => {
    onBeforeClickApp()
    const pathname = getPathname(location)
    const newHref = `https://redirect.audius.co${APP_REDIRECT}${pathname}`

    // If we're on the signup page, copy the URL to clipboard on app redirect
    // The app can then read the URL on load, persisting through install, to associate referrals
    if (
      window.isSecureContext &&
      matchPath(SIGN_UP_PAGE, window.location.pathname)?.pathname ===
        window.location.pathname
    ) {
      navigator.clipboard.writeText(window.location.href)
    }
    window.location.href = newHref
    decrementScroll()
  }

  const onDismiss = () => {
    onBeforeClickDismissed()
    setIsDismissed(true)
    decrementScroll()
  }

  return (
    <>
      {backgroundTransitions.map(({ item, props, key }) => {
        return (
          item && (
            <animatedAny.div
              style={props}
              className={styles.container}
              key={key}
              onClick={onDismiss}
            >
              {drawerTransitions.map(({ item, props, key }) => {
                return (
                  item && (
                    <animatedAny.div
                      style={props}
                      className={styles.popover}
                      key={key}
                    >
                      {elementTransitions.map(
                        ({ item: newItem, props, key }) => {
                          return (
                            <Fragment key={key}>
                              <div
                                className={styles.clickableArea}
                                onClick={onClick}
                              />
                              {newItem && (
                                <animatedAny.div
                                  style={{
                                    ...props,
                                    backgroundImage: `url(${AppIcon})`,
                                    backgroundSize: 'contain'
                                  }}
                                  className={styles.logo}
                                />
                              )}
                              {newItem && (
                                <animatedAny.div
                                  className={styles.mainButtonContainer}
                                  style={props}
                                >
                                  <Button
                                    variant='secondary'
                                    css={(theme) => ({
                                      borderRadius: theme.cornerRadius['2xl'],
                                      color: theme.color.secondary.secondary,
                                      background: theme.color.static.white
                                    })}
                                    onClick={onClick}
                                  >
                                    {messages.openInApp}
                                  </Button>
                                </animatedAny.div>
                              )}
                              {newItem && (
                                <animatedAny.div
                                  style={props}
                                  className={styles.notNow}
                                  onClick={onDismiss}
                                >
                                  {messages.notNow}
                                </animatedAny.div>
                              )}
                            </Fragment>
                          )
                        }
                      )}
                    </animatedAny.div>
                  )
                )
              })}
            </animatedAny.div>
          )
        )
      })}
    </>
  )
}
