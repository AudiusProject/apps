import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import { chatActions, chatSelectors } from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { IconMessageSlash, Hint } from '@audius/harmony-native'
import { useDrawer } from 'app/hooks/useDrawer'
import { track, make } from 'app/services/analytics'
import { EventNames } from 'app/types/analytics'

import { ConfirmationDrawer } from '../drawers'

const { getDoesBlockUser, useCanCreateChat } = chatSelectors
const { blockUser, unblockUser, createChat } = chatActions

const BLOCK_MESSAGES_MODAL_NAME = 'BlockMessages'

const messages = {
  header: 'Are you sure?',
  confirmBlock: (userName?: string, isReportAbuse?: boolean) =>
    `Are you sure you want to ${
      isReportAbuse ? 'report ' : 'block '
    }${userName}${
      isReportAbuse
        ? ' for abuse? They will be blocked from sending you new messages.'
        : ' from sending messages to your inbox?'
    }`,
  confirmUnblock: (userName?: string) =>
    `Are you sure you want to unblock ${userName} and allow them to send messages to your inbox?`,
  info: 'This will not affect their ability to view your profile or interact with your content.',
  blockUser: 'Block User',
  unblockUser: 'Unblock User',
  reportUser: 'Report & Block',
  cancel: 'Cancel'
}

export const BlockMessagesDrawer = () => {
  const dispatch = useDispatch()
  const { data } = useDrawer('BlockMessages')
  const { userId, shouldOpenChat, isReportAbuse } = data
  const { data: user } = useUser(userId)
  const doesBlockUser = useSelector((state) => getDoesBlockUser(state, userId))
  const { canCreateChat } = useCanCreateChat(userId)

  const handleConfirmPress = useCallback(() => {
    if (doesBlockUser) {
      dispatch(unblockUser({ userId }))
      if (shouldOpenChat && canCreateChat) {
        dispatch(createChat({ userIds: [userId] }))
      }
    } else {
      dispatch(blockUser({ userId }))
      if (isReportAbuse) {
        track(
          make({
            eventName: EventNames.CHAT_REPORT_USER,
            reportedUserId: userId
          })
        )
      }
    }
  }, [
    canCreateChat,
    dispatch,
    doesBlockUser,
    isReportAbuse,
    shouldOpenChat,
    userId
  ])

  const description = doesBlockUser
    ? messages.confirmUnblock(user?.name)
    : messages.confirmBlock(user?.name, isReportAbuse)

  const confirm = isReportAbuse
    ? messages.reportUser
    : doesBlockUser
      ? messages.unblockUser
      : messages.blockUser

  return (
    <ConfirmationDrawer
      drawerName={BLOCK_MESSAGES_MODAL_NAME}
      onConfirm={handleConfirmPress}
      messages={{ ...messages, description, confirm }}
      variant={doesBlockUser ? 'affirmative' : 'destructive'}
      icon={IconMessageSlash}
    >
      {doesBlockUser ? null : <Hint>{messages.info}</Hint>}
    </ConfirmationDrawer>
  )
}
