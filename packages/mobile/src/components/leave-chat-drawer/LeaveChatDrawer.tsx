import { useCallback } from 'react'

import { chatActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { IconSignOut } from '@audius/harmony-native'
import { useDrawer } from 'app/hooks/useDrawer'

import { ConfirmationDrawer } from '../drawers'

const { leaveChat } = chatActions

const LEAVE_CHAT_MODAL_NAME = 'LeaveChat'

const messages = {
  header: 'Leave Group',
  description:
    "Are you sure you want to leave this group? You won't get new messages unless someone starts a new group with you.",
  confirm: 'Leave Group',
  cancel: 'Cancel'
}

export const LeaveChatDrawer = () => {
  const dispatch = useDispatch()
  const { data } = useDrawer('LeaveChat')
  const { chatId } = data

  const handleConfirmPress = useCallback(() => {
    if (chatId) {
      dispatch(leaveChat({ chatId }))
    }
  }, [chatId, dispatch])

  return (
    <ConfirmationDrawer
      drawerName={LEAVE_CHAT_MODAL_NAME}
      icon={IconSignOut}
      onConfirm={handleConfirmPress}
      messages={messages}
    />
  )
}
