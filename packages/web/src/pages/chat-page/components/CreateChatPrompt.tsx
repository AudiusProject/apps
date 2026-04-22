import { useCallback } from 'react'

import { chatSelectors, useCreateChatModal } from '@audius/common/store'
import { Button } from '@audius/harmony'

import { useSelector } from 'common/hooks/useSelector'

import styles from './CreateChatPrompt.module.css'

const { getChats } = chatSelectors

const messages = {
  selectTitle: 'Select a Message',
  selectSubtitle: 'Open an existing conversation, or compose a new message!',
  newTitle: 'Nothing Here Yet',
  newSubtitle: 'Start a Conversation!',
  writeMessage: 'New Message'
}

type CreateChatPromptProps = {
  // When provided, overrides the internal `chats` selector. Used by ChatPage
  // to keep this card in sync with the sidebar's visibility when the account
  // has no chats.
  hasChats?: boolean
}

export const CreateChatPrompt = ({ hasChats }: CreateChatPromptProps = {}) => {
  const { onOpen: openCreateChatModal } = useCreateChatModal()
  const chats = useSelector(getChats)
  const resolvedHasChats = hasChats ?? (chats?.length ?? 0) > 0

  const handleClick = useCallback(() => {
    openCreateChatModal()
  }, [openCreateChatModal])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>
          {resolvedHasChats ? messages.selectTitle : messages.newTitle}
        </div>
        <div className={styles.subtitle}>
          {resolvedHasChats ? messages.selectSubtitle : messages.newSubtitle}
        </div>
      </div>
      <Button variant='primary' onClick={handleClick}>
        {messages.writeMessage}
      </Button>
    </div>
  )
}
