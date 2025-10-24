import { ChatPermission, HashId, Id, UserChat } from '@audius/sdk'
import { useSelector } from 'react-redux'
import { createSelector } from 'reselect'

import { useCurrentUserId } from '~/api'
import { ID } from '~/models/Identifiers'
import { Status } from '~/models/Status'
import { CommonState } from '~/store/reducers'
import { Maybe, removeNullable } from '~/utils/typeUtils'

import { chatMessagesAdapter, chatsAdapter } from './slice'
import { ChatPermissionAction } from './types'

const { selectById: selectChatById, selectAll: selectAllChats } =
  chatsAdapter.getSelectors<CommonState>((state) => state.pages.chat.chats)

const {
  selectAll: getAllChatMessages,
  selectById,
  selectIds: getChatMessageIds
} = chatMessagesAdapter.getSelectors()

export const getChatsStatus = (state: CommonState) =>
  state.pages.chat.chats.status

export const getChatsSummary = (state: CommonState) =>
  state.pages.chat.chats.summary

export const getHasMoreChats = (state: CommonState) => {
  const { status, summary } = state.pages.chat.chats
  return (
    status === Status.IDLE || (!!summary?.prev_count && summary.prev_count > 0)
  )
}

export const getOptimisticReads = (state: CommonState) =>
  state.pages.chat.optimisticChatRead

export const getOptimisticReactions = (state: CommonState) =>
  state.pages.chat.optimisticReactions

export const getBlockees = (state: CommonState) => state.pages.chat.blockees

export const getBlockers = (state: CommonState) => state.pages.chat.blockers

export const getChatPermissions = (state: CommonState) =>
  state.pages.chat.permissions

export const getChatPermissionsStatus = (state: CommonState) =>
  state.pages.chat.permissionsStatus

// Gets a chat and its optimistic read status
export const getChat = createSelector(
  [
    selectChatById,
    getOptimisticReads,
    (_: CommonState, chatId: string) => chatId
  ],
  (chat, optimisticReads, chatId) => {
    if (!chat) return undefined
    return {
      ...chat,
      ...optimisticReads[chatId]
    }
  }
)

export const getNonOptimisticChat = selectChatById

/**
 * Gets all chats and their optimistic read status
 */
export const getChats = createSelector(
  [selectAllChats, getOptimisticReads],
  (chats, optimisticReads) => {
    return chats?.map((chat) => {
      // If have a clientside optimistic read status, override the server status
      if (optimisticReads?.[chat.chat_id]) {
        chat = {
          ...chat,
          ...optimisticReads[chat.chat_id]
        }
      }
      return chat
    })
  }
)

export const getChatMessages = createSelector(
  [
    (state: CommonState, chatId: string) =>
      getAllChatMessages(
        state.pages.chat.messages[chatId] ??
          chatMessagesAdapter.getInitialState()
      ),
    getOptimisticReactions
  ],
  (messages, optimisticReactions) => {
    return messages?.map((message) => {
      const optimisticReaction = optimisticReactions[message.message_id]
      if (optimisticReaction) {
        return {
          ...message,
          reactions: [
            ...(message.reactions?.filter(
              (reaction) => optimisticReaction.user_id !== reaction.user_id
            ) ?? []),
            optimisticReaction
          ]
        }
      }
      return message
    })
  }
)

export const getUnreadMessagesCount = (state: CommonState) => {
  if (state.pages.chat.optimisticUnreadMessagesCount) {
    return state.pages.chat.optimisticUnreadMessagesCount
  }
  return state.pages.chat.unreadMessagesCount
}

export const getHasUnreadMessages = (state: CommonState) => {
  if (getUnreadMessagesCount(state) > 0) {
    return true
  }
  // This really shouldn't be necessary since the above should be kept in sync
  const chats = getChats(state)
  for (const chat of chats) {
    if (chat.is_blast) {
      return false
    }
    if (chat.unread_message_count > 0) {
      return true
    }
  }
  return false
}

/**
 * Gets a list of the users the current user has chats with.
 * Note that this only takes the first user of each chat that doesn't match the current one,
 * so this will need to be adjusted when we do group chats.
 **/
export const getUserList = createSelector(
  [
    getChats,
    getHasMoreChats,
    getChatsStatus,
    (_: CommonState, currentUserId: ID | null | undefined) => currentUserId
  ],
  (chats, hasMore, chatsStatus, currentUserId) => {
    const chatUserListIds = chats
      .filter((c) => !c.is_blast)
      .map(
        (c) =>
          (c as UserChat).chat_members
            .filter((u) => HashId.parse(u.user_id) !== currentUserId)
            .map((u) => HashId.parse(u.user_id))[0]
      )
      .filter(removeNullable)
    return {
      userIds: chatUserListIds,
      hasMore,
      loading: chatsStatus === Status.LOADING
    }
  }
)

export const getChatMessageByIndex = (
  state: CommonState,
  chatId: string,
  messageIndex: number
) => {
  const chatMessagesState = state.pages.chat.messages[chatId]
  if (!chatMessagesState) return undefined
  const messageIds = getChatMessageIds(chatMessagesState)
  const messageIdAtIndex = messageIds[messageIndex]
  return selectById(chatMessagesState, messageIdAtIndex)
}

export const getChatMessageById = (
  state: CommonState,
  chatId: string,
  messageId: string
) => {
  const chatMessagesState = state.pages.chat.messages[chatId]
  if (!chatMessagesState) return undefined
  return selectById(chatMessagesState, messageId)
}

export const getReactionsPopupMessageId = (state: CommonState) => {
  return state.pages.chat.reactionsPopupMessageId
}

export const isIdEqualToReactionsPopupMessageId = (
  state: CommonState,
  messageId: string
) => {
  return messageId === getReactionsPopupMessageId(state)
}

export const getUnfurlMetadata = (
  state: CommonState,
  chatId: string,
  messageId: string
) => {
  const message = getChatMessageById(state, chatId, messageId)
  return message?.unfurlMetadata
}

export const getUserChatPermissions = createSelector(
  [
    getChatPermissions,
    (_: CommonState, userId: ID | null | undefined) => userId
  ],
  (permissions, userId) => {
    return userId ? permissions[userId] : undefined
  }
)

export const getDoesBlockUser = createSelector(
  [getBlockees, (_state: CommonState, userId: ID) => userId],
  (blockees, userId) => blockees.includes(userId)
)

export const getChatPermissionsInfo = createSelector(
  [getBlockees, getBlockers, getChatPermissions, getChats],
  (blockees, blockers, chatPermissions, chats) => ({
    blockees,
    blockers,
    chatPermissions,
    chats
  })
)

export const useCanCreateChat = (userId: ID | null | undefined) => {
  const { data: currentUserId } = useCurrentUserId()
  const { blockees, blockers, chatPermissions, chats } = useSelector(
    getChatPermissionsInfo
  )
  if (!currentUserId) {
    return {
      canCreateChat: false,
      callToAction: ChatPermissionAction.SIGN_UP
    }
  }
  if (!userId) {
    return {
      canCreateChat: true,
      callToAction: ChatPermissionAction.NOT_APPLICABLE
    }
  }

  // Check for existing chat, since unblocked users with existing chats
  // don't need permission to continue chatting.
  // Use a callback fn to prevent iteration until necessary to improve perf
  // Note: this only works if the respective chat has been fetched already, like in chatsUserList
  const encodedUserId = Id.parse(userId)
  const existingChat = chats.find(
    (c) =>
      !c.is_blast && c.chat_members.find((u) => u.user_id === encodedUserId)
  )

  const userPermissions = chatPermissions[userId]
  const isBlockee = blockees.includes(userId)
  const isBlocker = blockers.includes(userId)
  const canCreateChat =
    !isBlockee &&
    !isBlocker &&
    ((userPermissions?.current_user_has_permission ?? true) ||
      (!!existingChat &&
        !existingChat.is_blast &&
        !existingChat?.recheck_permissions))

  let action = ChatPermissionAction.NOT_APPLICABLE
  if (!canCreateChat) {
    if (!userPermissions) {
      action = ChatPermissionAction.WAIT
    } else if (blockees.includes(userId)) {
      action = ChatPermissionAction.UNBLOCK
    } else if (userPermissions.permit_list.includes(ChatPermission.FOLLOWERS)) {
      action = ChatPermissionAction.FOLLOW
    } else if (userPermissions.permit_list.includes(ChatPermission.TIPPERS)) {
      action = ChatPermissionAction.TIP
    } else {
      action = ChatPermissionAction.NONE
    }
  }
  return {
    canCreateChat,
    callToAction: action
  }
}

export const getRecheckPermissions = (
  state: CommonState,
  chatId: Maybe<string>
) => {
  const chat = chatId ? getChat(state, chatId) : undefined
  return chat?.is_blast || !!chat?.recheck_permissions
}
