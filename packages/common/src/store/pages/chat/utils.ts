import { ChatCategory, Id } from '@audius/sdk'

import { ID } from '~/models/Identifiers'

import { type ChatCategoryKey, InboxTab } from './types'

// `is_blast` is included so blast chats (which carry no category) satisfy the
// structural check without a cast.
type Categorizable = { category?: ChatCategory | null; is_blast?: boolean }

/** The unread-count bucket a chat belongs to. */
export const getChatCategoryKey = (chat: Categorizable): ChatCategoryKey =>
  chat.category ?? 'uncategorized'

/**
 * The inbox tab a chat is displayed under. Only chats explicitly marked
 * General leave the Priority tab; uncategorized chats stay in Priority.
 */
export const getInboxTabForChat = (chat: Categorizable): InboxTab =>
  chat.category === ChatCategory.GENERAL ? InboxTab.GENERAL : InboxTab.PRIORITY

export const makeChatId = (userIds: ID[]) => {
  return userIds
    .map((id) => Id.parse(id))
    .sort()
    .join(':')
}
