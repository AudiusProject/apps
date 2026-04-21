import { useCallback } from 'react'

import { chatSelectors, useCreateChatModal } from '@audius/common/store'
import { Button, IconCompose } from '@audius/harmony'

import { useSelector } from 'common/hooks/useSelector'

import styles from './CreateChatPrompt.module.css'

const { getChats } = chatSelectors

const messages = {
  selectTitle: 'Select a Message',
  selectSubtitle: 'Open an existing conversation, or compose a new message!',
  newTitle: 'Start a Conversation!',
  newSubtitle:
    'Connect with other Audius users by starting a private direct message!',
  writeMessage: 'New Message'
}

export const CreateChatPrompt = () => {
  const { onOpen: openCreateChatModal } = useCreateChatModal()
  const chats = useSelector(getChats)
  const hasChats = chats?.length > 0

  const handleClick = useCallback(() => {
    openCreateChatModal()
  }, [openCreateChatModal])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>
          {hasChats ? messages.selectTitle : messages.newTitle}
        </div>
        <div className={styles.subtitle}>
          {hasChats ? messages.selectSubtitle : messages.newSubtitle}
        </div>
      </div>
      <Button variant='primary' iconLeft={IconCompose} onClick={handleClick}>
        {messages.writeMessage}
      </Button>
    </div>
  )
}
