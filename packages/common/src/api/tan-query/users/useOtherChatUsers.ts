import { HashId } from '@audius/sdk/services'
import { useSelector } from 'react-redux'

import { useUsers, useCurrentUserId } from '~/api'
import { ID } from '~/models'
import { CommonState } from '~/store/commonStore'
import { getChat } from '~/store/pages/chat/selectors'
import { Chat } from '~/store/pages/chat/slice'

export const getChatMemberUserIds = (
  chat: Chat | undefined,
  currentUserId: ID | null | undefined
) => {
  return chat && 'chat_members' in chat
    ? chat.chat_members
        .filter((u) => HashId.parse(u.user_id) !== currentUserId)
        .map((u) => HashId.parse(u.user_id) ?? -1)
        .filter((u) => u > -1)
    : []
}

export const useOtherChatUsersFromChat = (chat?: Chat) => {
  const { data: currentUserId } = useCurrentUserId()
  const ids = getChatMemberUserIds(chat, currentUserId)
  const { data: users } = useUsers(ids)
  return users ?? []
}

export const useOtherChatUsers = (chatId?: string) => {
  const chat = useSelector((state: CommonState) =>
    chatId ? getChat(state, chatId) : undefined
  )
  return useOtherChatUsersFromChat(chat)
}
