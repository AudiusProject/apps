import { useMemo } from 'react'

import { chatActions } from '@audius/common/store'
import { IconMessages, IconStar, type PopupMenuItem } from '@audius/harmony'
import { ChatCategory, type ChatBlast, type UserChat } from '@audius/sdk'
import { useDispatch } from 'react-redux'

const { setChatCategory } = chatActions

const messages = {
  moveToPriority: 'Move to Priority',
  moveToGeneral: 'Move to General'
}

/**
 * Popup menu items for moving a chat between the Priority and General inbox
 * tabs. Only the categories the chat is not already in are offered. Blasts
 * (and unknown chats) get no items.
 */
export const useChatCategoryMenuItems = (
  chat: UserChat | ChatBlast | undefined
): PopupMenuItem[] => {
  const dispatch = useDispatch()
  const chatId = chat?.chat_id
  const isBlast = chat?.is_blast ?? false
  const category = chat && !chat.is_blast ? (chat.category ?? null) : null

  return useMemo(() => {
    if (!chatId || isBlast) return []
    const items: PopupMenuItem[] = []
    if (category !== ChatCategory.PRIORITY) {
      items.push({
        text: messages.moveToPriority,
        icon: <IconStar />,
        onClick: () =>
          dispatch(setChatCategory({ chatId, category: ChatCategory.PRIORITY }))
      })
    }
    if (category !== ChatCategory.GENERAL) {
      items.push({
        text: messages.moveToGeneral,
        icon: <IconMessages />,
        onClick: () =>
          dispatch(setChatCategory({ chatId, category: ChatCategory.GENERAL }))
      })
    }
    return items
  }, [chatId, isBlast, category, dispatch])
}
