import { useEffect, useState } from 'react'

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
import { useBlocker } from 'react-router-dom'

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
 * Adapted from https://gist.github.com/michchan/0b142324b2a924a108a689066ad17038#file-routeleavingguard-function-ts-ca839f5faf39-tsx
 */
export const NavigationPrompt = (props: Props) => {
  const { when, shouldBlockNavigation, messages } = props
  const [modalVisible, setModalVisible] = useState(false)

  // useBlocker replaces Prompt in React Router v6
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when === true &&
      (!shouldBlockNavigation ||
        shouldBlockNavigation(nextLocation as Location))
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setModalVisible(true)
    }
  }, [blocker.state])

  const closeModal = () => {
    setModalVisible(false)
    // Reset the blocker to allow navigation to be cancelled
    blocker?.reset?.()
  }

  const handleConfirmNavigationClick = () => {
    setModalVisible(false)
    // Proceed with the blocked navigation
    blocker?.proceed?.()
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
