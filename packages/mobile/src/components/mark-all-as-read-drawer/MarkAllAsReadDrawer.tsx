import { useCallback } from 'react'

import { chatActions, chatSelectors } from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { IconCheck } from '@audius/harmony-native'

import { ConfirmationDrawer } from '../drawers'

const { markAllChatsAsRead } = chatActions
const { getChats, getUnreadMessagesCount } = chatSelectors

const MARK_ALL_AS_READ_DRAWER_NAME = 'MarkAllAsRead'

const messages = {
  header: 'Mark All as Read',
  confirm: 'Mark as Read',
  cancel: 'Cancel'
}

const buildDescription = (unreadCount: number, chatCount: number) =>
  `Mark ${unreadCount} unread ${
    unreadCount === 1 ? 'message' : 'messages'
  } across ${chatCount} ${
    chatCount === 1 ? 'conversation' : 'conversations'
  } as read?`

export const MarkAllAsReadDrawer = () => {
  const dispatch = useDispatch()
  const unreadCount = useSelector(getUnreadMessagesCount)
  const chats = useSelector(getChats)
  const unreadChatCount = chats.filter(
    (c) => !c.is_blast && (c.unread_message_count ?? 0) > 0
  ).length

  const handleConfirmPress = useCallback(() => {
    dispatch(markAllChatsAsRead())
  }, [dispatch])

  return (
    <ConfirmationDrawer
      drawerName={MARK_ALL_AS_READ_DRAWER_NAME}
      icon={IconCheck}
      variant='affirmative'
      onConfirm={handleConfirmPress}
      messages={{
        header: messages.header,
        description: buildDescription(unreadCount, unreadChatCount),
        confirm: messages.confirm,
        cancel: messages.cancel
      }}
    />
  )
}
