import {
  type TypedCommsResponse,
  type UserChat,
  type ChatMessage,
  type ChatMessageReaction,
  type ChatMessageNullableReaction,
  type UnfurlResponse,
  type ValidatedChatPermissions,
  type ChatBlastAudience,
  type ChatBlast,
  Id
} from '@audius/sdk'
import {
  Action,
  createSlice,
  PayloadAction,
  createEntityAdapter,
  EntityState
} from '@reduxjs/toolkit'

import { ID, Status, ChatMessageWithExtras } from '~/models'
import { signOut } from '~/store/sign-out/slice'
import { hasTail } from '~/utils/chatUtils'
import dayjs from '~/utils/dayjs'

import { ChatWebsocketError } from './types'

export type Chat = UserChat | ChatBlast

export type UserChatWithMessagesStatus = Chat & {
  messagesStatus?: Status | 'PENDING'
  messagesSummary?: TypedCommsResponse<ChatMessage>['summary']
}

type ChatID = string

type ChatState = {
  chats: EntityState<UserChatWithMessagesStatus> & {
    status: Status | 'REFRESHING'
    summary?: TypedCommsResponse<UserChat>['summary']
  }
  messages: Record<
    ChatID,
    EntityState<ChatMessageWithExtras> & {
      status?: Status
      summary?: TypedCommsResponse<ChatMessage>['summary']
    }
  >
  unreadMessagesCount: number
  optimisticUnreadMessagesCount?: number
  optimisticReactions: Record<string, ChatMessageReaction>
  optimisticChatRead: Record<
    string,
    Pick<UserChat, 'last_read_at' | 'unread_message_count'>
  >
  activeChatId: string | null
  blockees: ID[]
  blockers: ID[]
  permissions: Record<ID, ValidatedChatPermissions>
  permissionsStatus: Status
  reactionsPopupMessageId: string | null
}

type SetMessageReactionPayload = {
  userId: ID
  chatId: string
  messageId: string
  reaction: string | null
}

const chatSortComparator = (a: Chat, b: Chat) => {
  const aLastMessageAt = dayjs(a.last_message_at)
  const bLastMessageAt = dayjs(b.last_message_at)
  const alphabeticalSort = a.chat_id.localeCompare(b.chat_id)
  // If last message timestamps are the same, favor blasts on top, then sort by chat_id alphabetically
  if (aLastMessageAt.isSame(bLastMessageAt)) {
    if (a.is_blast || b.is_blast) {
      return a.is_blast && !b.is_blast
        ? -1
        : b.is_blast && !a.is_blast
          ? 1
          : alphabeticalSort
    }
    return alphabeticalSort
  }
  return aLastMessageAt.isBefore(bLastMessageAt) ? 1 : -1
}

export const chatsAdapter = createEntityAdapter<UserChatWithMessagesStatus>({
  selectId: (chat) => chat.chat_id,
  sortComparer: chatSortComparator
})

const { selectById: getChat } = chatsAdapter.getSelectors(
  (state: ChatState) => state.chats
)

const messageSortComparator = (a: ChatMessage, b: ChatMessage) =>
  dayjs(a.created_at).isBefore(dayjs(b.created_at)) ? 1 : -1

export const chatMessagesAdapter = createEntityAdapter<ChatMessageWithExtras>({
  selectId: (message) => message.message_id,
  sortComparer: messageSortComparator
})

const {
  selectById: getMessage,
  selectEntities: getAllMessages,
  selectIds: getAllMessageIds
} = chatMessagesAdapter.getSelectors()

// Recalculate hasTail for the message at index + 1 (the previous message of
// the message at the given index).
const recalculatePreviousMessageHasTail = (
  chatState: EntityState<ChatMessageWithExtras>,
  index: number
): void => {
  const messageIds = getAllMessageIds(chatState)
  const chatMessages = getAllMessages(chatState)
  const prevMessageId = messageIds[index + 1]
  const prevMessage = chatMessages[prevMessageId]
  if (!prevMessage) return
  const newMessageId = messageIds[index]
  const newMessage = chatMessages[newMessageId]
  chatMessagesAdapter.updateOne(chatState, {
    id: prevMessageId,
    changes: { hasTail: hasTail(prevMessage, newMessage) }
  })
}

const initialState: ChatState = {
  chats: {
    status: Status.IDLE,
    ...chatsAdapter.getInitialState()
  },
  messages: {},
  unreadMessagesCount: 0,
  optimisticChatRead: {},
  optimisticReactions: {},
  activeChatId: null,
  blockees: [],
  blockers: [],
  permissions: {},
  permissionsStatus: Status.IDLE,
  reactionsPopupMessageId: null
}

const slice = createSlice({
  name: 'application/pages/chat',
  initialState,
  reducers: {
    createChat: (
      _state,
      _action: PayloadAction<{
        userIds: ID[]
        skipNavigation?: boolean
        presetMessage?: string
        replaceNavigation?: boolean
      }>
    ) => {
      // triggers saga
    },
    createChatBlast: (
      _state,
      _action: PayloadAction<{
        audience: ChatBlastAudience
        audienceContentId?: number
        audienceContentType?: 'track' | 'album'
        skipNavigation?: boolean
        presetMessage?: string
        replaceNavigation?: boolean
      }>
    ) => {
      // triggers saga
    },
    createChatSucceeded: (state, action: PayloadAction<{ chat: Chat }>) => {
      const { chat } = action.payload
      chatsAdapter.upsertOne(state.chats, {
        ...chat,
        messagesStatus: Status.IDLE // ensures ChatScreen/ChatMessagesList show "Say Hi"
      })
      if (!(chat.chat_id in state.messages)) {
        state.messages[chat.chat_id] = chatMessagesAdapter.getInitialState()
      }
    },
    fetchUnreadMessagesCount: (_state) => {
      // triggers saga
    },
    fetchUnreadMessagesCountSucceeded: (
      state,
      action: PayloadAction<{ unreadMessagesCount: number }>
    ) => {
      state.unreadMessagesCount = action.payload.unreadMessagesCount
      delete state.optimisticUnreadMessagesCount
    },
    fetchUnreadMessagesCountFailed: (_state) => {},
    goToChat: (
      _state,
      _action: PayloadAction<{
        chatId?: string
        presetMessage?: string
        replaceNavigation?: boolean
      }>
    ) => {
      // triggers saga
    },
    fetchLatestChats: (state) => {
      // triggers saga
      state.chats.status = 'REFRESHING'
    },
    fetchMoreChats: (state) => {
      // triggers saga
      state.chats.status = Status.LOADING
    },
    fetchMoreChatsSucceeded: (
      state,
      action: PayloadAction<
        Pick<TypedCommsResponse<UserChat[]>, 'data' | 'summary'>
      >
    ) => {
      const { data, summary } = action.payload
      state.chats.status = Status.SUCCESS
      if (!state.chats.summary) {
        state.chats.summary = summary
      } else {
        if (
          summary?.next_cursor &&
          dayjs(summary?.next_cursor).isAfter(state.chats.summary.next_cursor)
        ) {
          state.chats.summary.next_cursor = summary?.next_cursor
          state.chats.summary.next_count = summary?.next_count
        }
        if (
          summary?.prev_cursor &&
          dayjs(summary?.prev_cursor).isBefore(state.chats.summary.prev_cursor)
        ) {
          state.chats.summary.prev_cursor = summary?.prev_cursor
          state.chats.summary.prev_count = summary?.prev_count
        }
      }
      for (const chat of data) {
        if (!(chat.chat_id in state.messages)) {
          state.messages[chat.chat_id] = chatMessagesAdapter.getInitialState()
        }
      }
      chatsAdapter.upsertMany(state.chats, data)
    },
    fetchMoreChatsFailed: (state) => {
      state.chats.status = Status.ERROR
    },
    fetchLatestMessages: (state, action: PayloadAction<{ chatId: string }>) => {
      // triggers saga
      if (!state.messages[action.payload.chatId]) {
        state.messages[action.payload.chatId] = {
          ...chatMessagesAdapter.getInitialState(),
          status: Status.LOADING
        }
      } else {
        state.messages[action.payload.chatId].status = Status.LOADING
      }
    },
    fetchMoreMessages: (state, action: PayloadAction<{ chatId: string }>) => {
      // triggers saga
      if (!state.messages[action.payload.chatId]) {
        state.messages[action.payload.chatId] = {
          ...chatMessagesAdapter.getInitialState(),
          status: Status.LOADING
        }
      } else {
        state.messages[action.payload.chatId].status = Status.LOADING
      }
    },
    fetchMoreMessagesSucceeded: (
      state,
      action: PayloadAction<{
        response: Pick<TypedCommsResponse<ChatMessage[]>, 'summary' | 'data'>
        chatId: string
      }>
    ) => {
      const {
        chatId,
        response: { data, summary }
      } = action.payload
      if (!summary) {
        console.error('fetchMoreMessagesSucceeded: no summary')
        return
      }

      // Update the summary to include the max of next_cursor and
      // min of prev_cursor.
      const existingSummary = state.chats.entities[chatId]?.messagesSummary
      const summaryToUse = { ...summary, ...existingSummary }
      if (
        !existingSummary ||
        dayjs(summary.next_cursor).isAfter(existingSummary.next_cursor)
      ) {
        summaryToUse.next_count = summary.next_count
        summaryToUse.next_cursor = summary.next_cursor
      }
      if (
        !existingSummary ||
        dayjs(summary.prev_cursor).isBefore(existingSummary.prev_cursor)
      ) {
        summaryToUse.prev_count = summary.prev_count
        summaryToUse.prev_cursor = summary.prev_cursor
      }

      chatsAdapter.updateOne(state.chats, {
        id: chatId,
        changes: {
          messagesStatus: Status.SUCCESS,
          messagesSummary: summaryToUse
        }
      })
      const messagesWithTail = data.map((item, index) => {
        return { ...item, hasTail: hasTail(item, data[index - 1]) }
      })
      chatMessagesAdapter.upsertMany(state.messages[chatId], messagesWithTail)
      if (data.length > 0) {
        recalculatePreviousMessageHasTail(
          state.messages[chatId],
          summary.next_count - 1
        )
      }
    },
    fetchMoreMessagesFailed: (
      state,
      action: PayloadAction<{ chatId: string }>
    ) => {
      const { chatId } = action.payload
      chatsAdapter.updateOne(state.chats, {
        id: chatId,
        changes: { messagesStatus: Status.ERROR }
      })
    },
    setMessageReaction: (
      state,
      action: PayloadAction<SetMessageReactionPayload>
    ) => {
      // triggers saga
      // Optimistically set reaction
      const { userId, messageId, reaction } = action.payload
      const encodedUserId = Id.parse(userId)
      if (reaction) {
        state.optimisticReactions[messageId] = {
          user_id: encodedUserId,
          reaction,
          created_at: dayjs().toISOString()
        }
      } else {
        delete state.optimisticReactions[messageId]
      }
    },
    setMessageReactionSucceeded: (
      state,
      action: PayloadAction<{
        chatId: string
        messageId: string
        reaction: ChatMessageNullableReaction
      }>
    ) => {
      // Set the true state
      const { chatId, messageId, reaction } = action.payload
      delete state.optimisticReactions[messageId]

      // Ensure the chat and message exists. If not, saga will fetch.
      if (!(chatId in state.messages)) {
        return
      }
      const existingMessage = getMessage(state.messages[chatId], messageId)
      if (!existingMessage) {
        return
      }
      const existingReactions = existingMessage?.reactions ?? []
      const filteredReactions = existingReactions.filter(
        (r) => r.user_id !== reaction.user_id
      )
      if (reaction.reaction !== null) {
        filteredReactions.push(reaction)
      }
      chatMessagesAdapter.updateOne(state.messages[chatId], {
        id: messageId,
        changes: { reactions: filteredReactions }
      })
    },
    setMessageReactionFailed: (
      state,
      action: PayloadAction<SetMessageReactionPayload>
    ) => {
      // Reset our optimism :(
      const { messageId } = action.payload
      delete state.optimisticReactions[messageId]
    },
    fetchChatIfNecessary: (
      _state,
      _action: PayloadAction<{ chatId: string }>
    ) => {
      // triggers saga
    },
    fetchChatSucceeded: (state, action: PayloadAction<{ chat: UserChat }>) => {
      const { chat } = action.payload
      if (dayjs(chat.cleared_history_at).isAfter(chat.last_message_at)) {
        chat.last_message = ''
      }
      const existingChat = getChat(state, chat.chat_id)
      // If the chat already exists, use its existing messagesStatus, otherwise default to PENDING
      const messagesStatus = existingChat?.messagesStatus ?? 'PENDING'
      chatsAdapter.upsertOne(state.chats, {
        ...chat,
        messagesStatus
      })
      if (!(chat.chat_id in state.messages)) {
        state.messages[chat.chat_id] = chatMessagesAdapter.getInitialState()
      }
    },
    markChatAsRead: (state, action: PayloadAction<{ chatId: string }>) => {
      // triggers saga
      // Optimistically mark as read
      const { chatId } = action.payload
      const existingChat = getChat(state, chatId)
      if (existingChat && !existingChat.is_blast) {
        state.optimisticChatRead[chatId] = {
          last_read_at: existingChat.last_message_at,
          unread_message_count: 0
        }
        if (state.optimisticUnreadMessagesCount) {
          state.optimisticUnreadMessagesCount -=
            existingChat.unread_message_count
        } else {
          state.optimisticUnreadMessagesCount =
            state.unreadMessagesCount - existingChat.unread_message_count
        }
      }
    },
    markChatAsReadSucceeded: (
      state,
      action: PayloadAction<{ chatId: string }>
    ) => {
      // Set the true state
      const { chatId } = action.payload
      delete state.optimisticChatRead[chatId]
      delete state.optimisticUnreadMessagesCount
      const existingChat = getChat(state, chatId)
      if (!existingChat || existingChat.is_blast) return
      state.unreadMessagesCount -= existingChat?.unread_message_count ?? 0
      chatsAdapter.updateOne(state.chats, {
        id: chatId,
        changes: {
          last_read_at: existingChat?.last_message_at,
          unread_message_count: 0
        }
      })
    },
    markChatAsReadFailed: (
      state,
      action: PayloadAction<{ chatId: string }>
    ) => {
      // Reset our optimism :(
      const { chatId } = action.payload
      delete state.optimisticChatRead[chatId]
      delete state.optimisticUnreadMessagesCount
    },
    sendMessage: (
      state,
      action: PayloadAction<{
        chatId: string
        message: string
        audience?: ChatBlastAudience
        resendMessageId?: string
      }>
    ) => {
      // triggers saga which will add a message optimistically and replace it after success
      const { chatId, resendMessageId } = action.payload
      if (resendMessageId) {
        chatMessagesAdapter.updateOne(state.messages[chatId], {
          id: resendMessageId,
          changes: { status: Status.LOADING }
        })
      }
    },
    addMessage: (
      state,
      action: PayloadAction<{
        chatId: string
        message: ChatMessage
        isSelfMessage: boolean
        status?: Status
      }>
    ) => {
      // triggers saga to get chat if not exists
      const { chatId, message, status, isSelfMessage } = action.payload

      // Always update the last message, but don't update
      // last_message_at if it's a blast message sent by current user,
      // to avoid chat list re-sorting.
      // Note: is_plaintext indicates that the message originated from a blast
      const existingChat = getChat(state, chatId)
      const changes =
        message.is_plaintext && isSelfMessage && !existingChat?.is_blast
          ? {
              last_message: message.message
            }
          : {
              last_message: message.message,
              last_message_at: message.created_at
            }

      chatsAdapter.updateOne(state.chats, {
        id: chatId,
        changes
      })

      // If no chatId, don't add the message
      // and abort early, relying on the saga
      // to fetch the chat
      if (!(chatId in state.messages)) {
        return
      }

      // Return early if we've seen this message: don't update
      // recheck_permissions unless it's a message received from someone else
      const existingMessage = getMessage(
        state.messages[chatId],
        message.message_id
      )
      if (existingMessage) return

      // Add the message
      chatMessagesAdapter.addOne(state.messages[chatId], {
        ...message,
        hasTail: true,
        status: status ?? Status.IDLE
      })
      chatsAdapter.updateOne(state.chats, {
        id: chatId,
        changes: {
          // If a new message comes through, we don't need to recheck permissions anymore
          recheck_permissions: false
        }
      })

      // Recalculate tails
      recalculatePreviousMessageHasTail(state.messages[chatId], 0)

      // Handle unread counts
      if (!existingChat || existingChat.is_blast) return
      const optimisticRead = state.optimisticChatRead[chatId]
      const existingUnreadCount = optimisticRead
        ? optimisticRead.unread_message_count
        : (existingChat?.unread_message_count ?? 0)
      if (!isSelfMessage) {
        // If we're actively reading, this will immediately get marked as read.
        // Ignore the unread bump to prevent flicker
        if (state.activeChatId !== chatId) {
          chatsAdapter.updateOne(state.chats, {
            id: chatId,
            changes: { unread_message_count: existingUnreadCount + 1 }
          })
        }

        // Web or mobile: update optimistic unread count
        state.optimisticUnreadMessagesCount =
          (state.optimisticUnreadMessagesCount ?? state.unreadMessagesCount) + 1
      } else {
        // Mark chat as read if its our own
        chatsAdapter.updateOne(state.chats, {
          id: chatId,
          changes: {
            unread_message_count: 0,
            last_read_at: message.created_at
          }
        })
        state.optimisticUnreadMessagesCount =
          (state.optimisticUnreadMessagesCount ?? state.unreadMessagesCount) -
          existingUnreadCount
      }
    },
    /**
     * Marks the chat as currently being read.
     * Prevents flicker of unread status when new messages come in if actively reading.
     */
    setActiveChat: (
      state,
      action: PayloadAction<{ chatId: string | null }>
    ) => {
      const { chatId } = action.payload
      state.activeChatId = chatId
    },
    sendMessageFailed: (
      state,
      action: PayloadAction<{
        chatId: string
        messageId: string
      }>
    ) => {
      // Mark message as not sent
      const { chatId, messageId } = action.payload
      chatMessagesAdapter.updateOne(state.messages[chatId], {
        id: messageId,
        changes: { status: Status.ERROR }
      })
    },
    connect: (_state, _action: Action) => {
      // triggers middleware
    },
    disconnect: (_state, _action: Action) => {
      // triggers middleware
    },
    fetchBlockees: (_state, _action: Action) => {
      // triggers saga
    },
    fetchBlockeesSucceeded: (
      state,
      action: PayloadAction<{ blockees: ID[] }>
    ) => {
      state.blockees = action.payload.blockees
    },
    fetchBlockers: (_state, _action: Action) => {
      // triggers saga
    },
    fetchBlockersSucceeded: (
      state,
      action: PayloadAction<{ blockers: ID[] }>
    ) => {
      state.blockers = action.payload.blockers
    },
    blockUser: (_state, _action: PayloadAction<{ userId: ID }>) => {
      // triggers saga
    },
    unblockUser: (_state, _action: PayloadAction<{ userId: ID }>) => {
      // triggers saga
    },
    fetchPermissions: (state, _action: PayloadAction<{ userIds: ID[] }>) => {
      state.permissionsStatus = Status.LOADING
      // triggers saga
    },
    fetchPermissionsSucceeded: (
      state,
      action: PayloadAction<{
        permissions: Record<ID, ValidatedChatPermissions>
      }>
    ) => {
      state.permissions = {
        ...state.permissions,
        ...action.payload.permissions
      }
      state.permissionsStatus = Status.SUCCESS
    },
    // Note: is not associated with any chatId because there will be at most
    // one popup message at a time. Used for reactions popup overlay in mobile.
    setReactionsPopupMessageId: (
      state,
      action: PayloadAction<{
        messageId: string | null
      }>
    ) => {
      state.reactionsPopupMessageId = action.payload.messageId
    },
    fetchLinkUnfurl: (
      _state,
      _action: PayloadAction<{
        chatId: string
        messageId: string
        href: string
      }>
    ) => {
      // triggers saga
    },
    fetchLinkUnfurlSucceeded: (
      state,
      action: PayloadAction<{
        messageId: string
        chatId: string
        unfurlMetadata: Partial<UnfurlResponse>
      }>
    ) => {
      const { messageId, chatId, unfurlMetadata } = action.payload
      chatMessagesAdapter.updateOne(state.messages[chatId], {
        id: messageId,
        changes: { unfurlMetadata }
      })
    },
    deleteChat: (_state, _action: PayloadAction<{ chatId: string }>) => {
      // triggers saga
    },
    deleteChatSucceeded: (state, action: PayloadAction<{ chatId: string }>) => {
      const { chatId } = action.payload
      chatsAdapter.removeOne(state.chats, chatId)
      chatMessagesAdapter.removeAll(state.messages[chatId])
    },
    logError: (
      _state,
      _action: PayloadAction<{ error: ChatWebsocketError }>
    ) => {
      // triggers saga
    }
  },
  extraReducers: {
    [signOut.type]: () => {
      return initialState
    }
  }
})

export const actions = slice.actions

export default slice.reducer
