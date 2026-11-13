import { ChatCategory, Id } from '@audius/sdk'

import { ID } from '~/models/Identifiers'

import { type ChatCategoryKey, InboxTab } from './types'

// `is_blast` is included so blast chats (which carry no category) satisfy the
// structural check without a cast.
type Categorizable = {
  category?: ChatCategory | null
  has_replied?: boolean
  is_blast?: boolean
}

/**
 * The unread-count buckets a chat belongs to. An uncategorized chat the user
 * never replied to also counts towards `uncategorized_unreplied`.
 */
export const getChatCategoryKeys = (chat: Categorizable): ChatCategoryKey[] => {
  if (chat.category) return [chat.category]
  return chat.has_replied === false
    ? ['uncategorized', 'uncategorized_unreplied']
    : ['uncategorized']
}

/**
 * The inbox tab a chat is displayed under. An explicit category wins.
 * Otherwise chats the user has replied in are Priority and the rest (new
 * inbound chats, blast threads) are General. Blasts the user sent, and chats
 * from an api that doesn't report `has_replied`, stay in Priority.
 */
export const getInboxTabForChat = (chat: Categorizable): InboxTab => {
  if (chat.category === ChatCategory.GENERAL) return InboxTab.GENERAL
  if (chat.category === ChatCategory.PRIORITY) return InboxTab.PRIORITY
  if (chat.is_blast) return InboxTab.PRIORITY
  return chat.has_replied === false ? InboxTab.GENERAL : InboxTab.PRIORITY
}

/** The category matching the tab a chat is shown in. */
export const getEffectiveChatCategory = (chat: Categorizable): ChatCategory =>
  getInboxTabForChat(chat) === InboxTab.GENERAL
    ? ChatCategory.GENERAL
    : ChatCategory.PRIORITY

/** Max members in a group chat, creator included. Matches the api. */
export const MAX_GROUP_CHAT_MEMBERS = 10

export const makeChatId = (userIds: ID[]) => {
  return userIds
    .map((id) => Id.parse(id))
    .sort()
    .join(':')
}
