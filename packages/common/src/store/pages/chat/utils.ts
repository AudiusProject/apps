import { ChatCategory, Id } from '@audius/sdk'

import { ID } from '~/models/Identifiers'

import { type ChatCategoryKey, InboxTab } from './types'

type Categorizable = {
  category?: ChatCategory | null
  has_replied?: boolean
  is_blast?: boolean
}

export const getChatCategoryKeys = (chat: Categorizable): ChatCategoryKey[] => {
  if (chat.category) return [chat.category]
  return chat.has_replied === false
    ? ['uncategorized', 'uncategorized_unreplied']
    : ['uncategorized']
}

export const getInboxTabForChat = (chat: Categorizable): InboxTab => {
  if (chat.category === ChatCategory.GENERAL) return InboxTab.GENERAL
  if (chat.category === ChatCategory.PRIORITY) return InboxTab.PRIORITY
  if (chat.is_blast) return InboxTab.PRIORITY
  return chat.has_replied === false ? InboxTab.GENERAL : InboxTab.PRIORITY
}

export const getEffectiveChatCategory = (chat: Categorizable): ChatCategory =>
  getInboxTabForChat(chat) === InboxTab.GENERAL
    ? ChatCategory.GENERAL
    : ChatCategory.PRIORITY

export const MAX_GROUP_CHAT_MEMBERS = 10

export const makeChatId = (userIds: ID[]) => {
  return userIds
    .map((id) => Id.parse(id))
    .sort()
    .join(':')
}
