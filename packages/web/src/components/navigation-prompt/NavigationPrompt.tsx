import { useEffect } from 'react'

import {
  Modal,
  ModalContent,
  ModalHeader,
  Button,
  ModalTitle,
  Text
} from '@audius/harmony'
import cn from 'classnames'
import { useBlocker, type Location } from 'react-router'

import layoutStyles from 'components/layout/layout.module.css'

import styles from './NavigationPrompt.module.css'

interface Props {
  when?: boolean | undefined
  shouldBlockNavigation?: (location: Location) => boolean
  /**
   * Also block in-app navigation (link clicks, navigate()), not just
   * back/forward. Only safe where the form never navigates away itself
   * after a save, e.g. the upload flow.
   */
  blockInAppNavigation?: boolean
  messages: {
    title: string
    body: string
    cancel: string
    proceed: string
  }
}

/**
 * Asks before leaving a page with unsaved changes: tab close/refresh,
 * back/forward, and in-app navigation when `blockInAppNavigation` is set.
 */
export const NavigationPrompt = (props: Props) => {
  const { when, shouldBlockNavigation, blockInAppNavigation, messages } = props

  const blocker = useBlocker(
    ({ currentLocation, nextLocation, historyAction }) => {
      if (when !== true) return false
      if (currentLocation.pathname === nextLocation.pathname) return false
      if (!blockInAppNavigation && historyAction !== 'POP') return false
      return shouldBlockNavigation ? shouldBlockNavigation(nextLocation) : true
    }
  )

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

  // Release a pending navigation if the form stops needing protection.
  useEffect(() => {
    if (blocker.state === 'blocked' && !when) {
      blocker.proceed()
    }
  }, [blocker, when])

  const closeModal = () => {
    if (blocker.state === 'blocked') blocker.reset()
  }

  const handleConfirmNavigationClick = () => {
    if (blocker.state === 'blocked') blocker.proceed()
  }

  return (
    <Modal
      isOpen={blocker.state === 'blocked'}
      onClose={closeModal}
      size='small'
    >
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
  )
}
