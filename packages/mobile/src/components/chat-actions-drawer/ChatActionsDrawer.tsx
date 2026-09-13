import { useCallback } from 'react'

import { chatActions, chatSelectors } from '@audius/common/store'
import { ChatCategory } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'

import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import type { AppState } from 'app/store'
import { setVisibility } from 'app/store/drawers/slice'

import ActionDrawer from '../action-drawer'

const { getDoesBlockUser, getChat } = chatSelectors
const { setChatCategory } = chatActions

const CHAT_ACTIONS_MODAL_NAME = 'ChatActions'

const messages = {
  visitProfile: 'Visit Profile',
  moveToPriority: 'Move to Priority',
  moveToGeneral: 'Move to General',
  blockMessages: 'Block Messages',
  unblockMessages: 'Unblock Messages',
  reportAbuse: 'Report Abuse',
  deleteConversation: 'Delete Conversation'
}

export const ChatActionsDrawer = () => {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { data } = useDrawer('ChatActions')
  const { userId, chatId } = data
  const doesBlockUser = useSelector((state: AppState) =>
    getDoesBlockUser(state, userId)
  )
  const chat = useSelector((state: AppState) => getChat(state, chatId))
  const category = chat && !chat.is_blast ? (chat.category ?? null) : null

  const closeDrawer = useCallback(() => {
    dispatch(
      setVisibility({
        drawer: 'ChatActions',
        visible: false
      })
    )
  }, [dispatch])

  const handleVisitProfilePress = useCallback(() => {
    closeDrawer()
    navigation.navigate('Profile', { id: userId })
  }, [closeDrawer, navigation, userId])

  const handleBlockMessagesPress = useCallback(() => {
    closeDrawer()
    dispatch(
      setVisibility({
        drawer: 'BlockMessages',
        visible: true,
        data: { userId }
      })
    )
  }, [closeDrawer, dispatch, userId])

  const handleReportPress = useCallback(() => {
    closeDrawer()
    dispatch(
      setVisibility({
        drawer: 'BlockMessages',
        visible: true,
        data: { userId, isReportAbuse: true }
      })
    )
  }, [closeDrawer, dispatch, userId])

  const handleMoveToPriorityPress = useCallback(() => {
    closeDrawer()
    dispatch(setChatCategory({ chatId, category: ChatCategory.PRIORITY }))
  }, [chatId, closeDrawer, dispatch])

  const handleMoveToGeneralPress = useCallback(() => {
    closeDrawer()
    dispatch(setChatCategory({ chatId, category: ChatCategory.GENERAL }))
  }, [chatId, closeDrawer, dispatch])

  const handleDeletePress = useCallback(() => {
    closeDrawer()
    dispatch(
      setVisibility({
        drawer: 'DeleteChat',
        visible: true,
        data: { chatId }
      })
    )
  }, [chatId, closeDrawer, dispatch])

  return (
    <ActionDrawer
      drawerName={CHAT_ACTIONS_MODAL_NAME}
      rows={[
        {
          text: messages.visitProfile,
          callback: handleVisitProfilePress
        },
        ...(category !== ChatCategory.PRIORITY
          ? [
              {
                text: messages.moveToPriority,
                callback: handleMoveToPriorityPress
              }
            ]
          : []),
        ...(category !== ChatCategory.GENERAL
          ? [
              {
                text: messages.moveToGeneral,
                callback: handleMoveToGeneralPress
              }
            ]
          : []),
        {
          text: doesBlockUser
            ? messages.unblockMessages
            : messages.blockMessages,
          callback: handleBlockMessagesPress
        },
        {
          text: messages.reportAbuse,
          callback: handleReportPress
        },
        {
          text: messages.deleteConversation,
          callback: handleDeletePress,
          isDestructive: true
        }
      ]}
    />
  )
}
