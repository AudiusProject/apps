import { useEffect, useState, useRef, useCallback } from 'react'

import {
  Modal,
  ModalContent,
  ModalHeader,
  Button,
  ModalTitle,
  Text
} from '@audius/harmony'
import cn from 'classnames'
import type { Location } from 'history'
import { useNavigate, useLocation } from 'react-router-dom'

import layoutStyles from 'components/layout/layout.module.css'

import styles from './NavigationPrompt.module.css'

interface Props {
  when?: boolean | undefined
  shouldBlockNavigation?: (location: Location) => boolean
  messages: {
    title: string
    body: string
    cancel: string
    proceed: string
  }
}

/**
 * Navigation prompt that works with BrowserRouter (non-data router).
 * Adapted from https://gist.github.com/michchan/0b142324b2a924a108a689066ad17038#file-routeleavingguard-function-ts-ca839f5faf39-tsx
 *
 * This implementation uses useBeforeUnload for browser navigation and
 * popstate events for back/forward button navigation.
 * Note: Programmatic navigation (via navigate() or Link clicks) cannot be
 * easily intercepted with BrowserRouter, but browser navigation is handled.
 */
export const NavigationPrompt = (props: Props) => {
  const { when, shouldBlockNavigation, messages } = props
  const [modalVisible, setModalVisible] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const pendingNavigationRef = useRef<string | null>(null)

  // Check if navigation should be blocked
  const checkShouldBlock = useCallback(
    (nextLocation: Location) => {
      if (when !== true) return false
      if (!shouldBlockNavigation) return true
      return shouldBlockNavigation(nextLocation)
    },
    [when, shouldBlockNavigation]
  )

  // Handle browser navigation (closing tab, refreshing, etc.)
  useEffect(() => {
    if (!when) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [when])

  // Listen for popstate events (browser back/forward button)
  useEffect(() => {
    if (!when) return

    const handlePopState = (e: PopStateEvent) => {
      const currentPath = location.pathname + location.search
      const nextPath = window.location.pathname + window.location.search

      // Check if we're navigating to a different path
      if (currentPath !== nextPath) {
        const nextLocation = {
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          state: e.state,
          key: 'default'
        } as Location

        if (checkShouldBlock(nextLocation)) {
          // Prevent navigation by pushing current location back
          window.history.pushState(null, '', currentPath)
          setModalVisible(true)
          pendingNavigationRef.current = nextPath
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [when, location, checkShouldBlock])

  const closeModal = () => {
    setModalVisible(false)
    pendingNavigationRef.current = null
  }

  const handleConfirmNavigationClick = () => {
    setModalVisible(false)
    const pendingPath = pendingNavigationRef.current
    pendingNavigationRef.current = null

    if (pendingPath) {
      navigate(pendingPath)
    }
  }

  return (
    <>
      <Modal isOpen={modalVisible} onClose={closeModal} size='small'>
        <ModalHeader>
          <ModalTitle title={messages.title} />
        </ModalHeader>
        <ModalContent>
          <div className={cn(layoutStyles.col, layoutStyles.gap6)}>
            <Text variant='body' size='l' textAlign='center'>
              {messages.body}
            </Text>
            <div className={cn(layoutStyles.row, layoutStyles.gap2)}>
              <Button
                className={styles.button}
                variant='secondary'
                onClick={closeModal}
              >
                {messages.cancel}
              </Button>
              <Button
                className={styles.button}
                variant='destructive'
                onClick={handleConfirmNavigationClick}
              >
                {messages.proceed}
              </Button>
            </div>
          </div>
        </ModalContent>
      </Modal>
    </>
  )
}
