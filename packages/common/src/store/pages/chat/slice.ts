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
  type ChatCategory,
  type ChatUnreadCountByCategory,
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
import { getChatCategoryKeys } from './utils'

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
  unreadMessagesCountByCategory?: ChatUnreadCountByCategory
  optimisticUnreadMessagesCountByCategory?: ChatUnreadCountByCategory
  pendingChatCategoryRollback: Record<ChatID, ChatCategory | null>
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

const adjustUnreadCountForChatCategory = (
  state: ChatState,
  chat: { category?: ChatCategory | null; has_replied?: boolean },
  delta: number
) => {
  if (!state.unreadMessagesCountByCategory || delta === 0) return
  const counts = state.optimisticUnreadMessagesCountByCategory ?? {
    ...state.unreadMessagesCountByCategory
  }
  applyUnreadCountDelta(counts, chat, delta)
  state.optimisticUnreadMessagesCountByCategory = counts
}

const applyUnreadCountDelta = (
  counts: ChatUnreadCountByCategory,
  chat: { category?: ChatCategory | null; has_replied?: boolean },
  delta: number
) => {
  for (const key of getChatCategoryKeys(chat)) {
    const current = counts[key]
    if (current === undefined) continue
    counts[key] = Math.max(0, current + delta)
  }
}

const getDisplayedUnreadCount = (state: ChatState, chatId: ChatID) => {
  const optimisticRead = state.optimisticChatRead[chatId]
  if (optimisticRead) return optimisticRead.unread_message_count
  const chat = getChat(state, chatId)
  return chat && !chat.is_blast ? chat.unread_message_count : 0
}

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
  pendingChatCategoryRollback: {},
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
        messagesStatus: Status.IDLE
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
      action: PayloadAction<{
        unreadMessagesCount: number
        unreadMessagesCountByCategory?: ChatUnreadCountByCategory
      }>
    ) => {
      const { unreadMessagesCount, unreadMessagesCountByCategory } =
        action.payload
      state.unreadMessagesCount = unreadMessagesCount
      delete state.optimisticUnreadMessagesCount
      if (unreadMessagesCountByCategory) {
        state.unreadMessagesCountByCategory = unreadMessagesCountByCategory
        delete state.optimisticUnreadMessagesCountByCategory
      }
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
      state.chats.status = 'REFRESHING'
    },
    fetchMoreChats: (state) => {
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
      } else if (summary) {
        if (
          summary.next_count === 0 ||
          (summary.next_cursor &&
            dayjs(summary.next_cursor).isAfter(state.chats.summary.next_cursor))
        ) {
          state.chats.summary.next_count = summary.next_count
          if (summary.next_cursor) {
            state.chats.summary.next_cursor = summary.next_cursor
          }
        }
        if (
          summary.prev_count === 0 ||
          (summary.prev_cursor &&
            dayjs(summary.prev_cursor).isBefore(
              state.chats.summary.prev_cursor
            ))
        ) {
          state.chats.summary.prev_count = summary.prev_count
          if (summary.prev_cursor) {
            state.chats.summary.prev_cursor = summary.prev_cursor
          }
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

      const existingSummary = state.chats.entities[chatId]?.messagesSummary
      const summaryToUse = { ...summary, ...existingSummary }
      if (
        !existingSummary ||
        summary.next_count === 0 ||
        (summary.next_cursor &&
          dayjs(summary.next_cursor).isAfter(existingSummary.next_cursor))
      ) {
        summaryToUse.next_count = summary.next_count
        if (summary.next_cursor || !existingSummary) {
          summaryToUse.next_cursor = summary.next_cursor
        }
      }
      if (
        !existingSummary ||
        summary.prev_count === 0 ||
        (summary.prev_cursor &&
          dayjs(summary.prev_cursor).isBefore(existingSummary.prev_cursor))
      ) {
        summaryToUse.prev_count = summary.prev_count
        if (summary.prev_cursor || !existingSummary) {
          summaryToUse.prev_cursor = summary.prev_cursor
        }
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
      const { chatId, messageId, reaction } = action.payload
      delete state.optimisticReactions[messageId]

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
      const { chatId } = action.payload
      const existingChat = getChat(state, chatId)
      if (existingChat && !existingChat.is_blast) {
        adjustUnreadCountForChatCategory(
          state,
          existingChat,
          -getDisplayedUnreadCount(state, chatId)
        )
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
      const { chatId } = action.payload
      delete state.optimisticChatRead[chatId]
      delete state.optimisticUnreadMessagesCount
      delete state.optimisticUnreadMessagesCountByCategory
      const existingChat = getChat(state, chatId)
      if (!existingChat || existingChat.is_blast) return
      state.unreadMessagesCount -= existingChat?.unread_message_count ?? 0
      if (state.unreadMessagesCountByCategory) {
        applyUnreadCountDelta(
          state.unreadMessagesCountByCategory,
          existingChat,
          -existingChat.unread_message_count
        )
      }
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
      const { chatId } = action.payload
      delete state.optimisticChatRead[chatId]
      delete state.optimisticUnreadMessagesCount
      delete state.optimisticUnreadMessagesCountByCategory
    },
    markAllChatsAsRead: (state) => {
      const allChats = chatsAdapter.getSelectors().selectAll(state.chats)
      for (const chat of allChats) {
        if (chat.is_blast) continue
        if (!chat.unread_message_count) continue
        state.optimisticChatRead[chat.chat_id] = {
          last_read_at: chat.last_message_at,
          unread_message_count: 0
        }
      }
      state.optimisticUnreadMessagesCount = 0
      if (state.unreadMessagesCountByCategory) {
        state.optimisticUnreadMessagesCountByCategory = {
          priority: 0,
          general: 0,
          uncategorized: 0,
          uncategorized_unreplied: 0
        }
      }
    },
    markAllChatsAsReadSucceeded: (state) => {
      for (const chatId of Object.keys(state.optimisticChatRead)) {
        const existingChat = chatsAdapter
          .getSelectors()
          .selectById(state.chats, chatId)
        if (!existingChat || existingChat.is_blast) continue
        chatsAdapter.updateOne(state.chats, {
          id: chatId,
          changes: {
            last_read_at: existingChat.last_message_at,
            unread_message_count: 0
          }
        })
      }
      state.optimisticChatRead = {}
      delete state.optimisticUnreadMessagesCount
      if (state.unreadMessagesCountByCategory) {
        state.unreadMessagesCountByCategory = {
          priority: 0,
          general: 0,
          uncategorized: 0,
          uncategorized_unreplied: 0
        }
      }
      delete state.optimisticUnreadMessagesCountByCategory
    },
    markAllChatsAsReadFailed: (state) => {
      state.optimisticChatRead = {}
      delete state.optimisticUnreadMessagesCount
      delete state.optimisticUnreadMessagesCountByCategory
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
      const { chatId, message, status, isSelfMessage } = action.payload

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

      if (!(chatId in state.messages)) {
        return
      }

      const existingMessage = getMessage(
        state.messages[chatId],
        message.message_id
      )
      if (existingMessage) return

      chatMessagesAdapter.addOne(state.messages[chatId], {
        ...message,
        hasTail: true,
        status: status ?? Status.IDLE
      })
      chatsAdapter.updateOne(state.chats, {
        id: chatId,
        changes: {
          recheck_permissions: false
        }
      })

      recalculatePreviousMessageHasTail(state.messages[chatId], 0)

      if (!existingChat || existingChat.is_blast) return
      const optimisticRead = state.optimisticChatRead[chatId]
      const existingUnreadCount = optimisticRead
        ? optimisticRead.unread_message_count
        : (existingChat?.unread_message_count ?? 0)
      if (!isSelfMessage) {
        if (state.activeChatId !== chatId) {
          chatsAdapter.updateOne(state.chats, {
            id: chatId,
            changes: { unread_message_count: existingUnreadCount + 1 }
          })
        }

        state.optimisticUnreadMessagesCount =
          (state.optimisticUnreadMessagesCount ?? state.unreadMessagesCount) + 1
        adjustUnreadCountForChatCategory(state, existingChat, 1)
      } else {
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
        adjustUnreadCountForChatCategory(
          state,
          existingChat,
          -existingUnreadCount
        )
        if (!message.is_plaintext && existingChat.has_replied === false) {
          chatsAdapter.updateOne(state.chats, {
            id: chatId,
            changes: { has_replied: true }
          })
        }
      }
    },
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
    leaveChat: (_state, _action: PayloadAction<{ chatId: string }>) => {
      // triggers saga, then deleteChatSucceeded
    },
    deleteChatSucceeded: (state, action: PayloadAction<{ chatId: string }>) => {
      const { chatId } = action.payload
      chatsAdapter.removeOne(state.chats, chatId)
      chatMessagesAdapter.removeAll(state.messages[chatId])
    },
    setChatCategory: (
      state,
      action: PayloadAction<{ chatId: string; category: ChatCategory | null }>
    ) => {
      const { chatId, category } = action.payload
      const existingChat = getChat(state, chatId)
      if (!existingChat || existingChat.is_blast) return
      const previousCategory = existingChat.category ?? null
      if (previousCategory === category) return
      if (!(chatId in state.pendingChatCategoryRollback)) {
        state.pendingChatCategoryRollback[chatId] = previousCategory
      }
      const unreadCount = getDisplayedUnreadCount(state, chatId)
      adjustUnreadCountForChatCategory(state, existingChat, -unreadCount)
      adjustUnreadCountForChatCategory(
        state,
        { category, has_replied: existingChat.has_replied },
        unreadCount
      )
      chatsAdapter.updateOne(state.chats, {
        id: chatId,
        changes: { category }
      })
    },
    setChatCategorySucceeded: (
      state,
      action: PayloadAction<{ chatId: string; category: ChatCategory | null }>
    ) => {
      const { chatId, category } = action.payload
      delete state.pendingChatCategoryRollback[chatId]
      const existingChat = getChat(state, chatId)
      if (!existingChat || existingChat.is_blast) return
      if ((existingChat.category ?? null) !== category) {
        chatsAdapter.updateOne(state.chats, {
          id: chatId,
          changes: { category }
        })
      }
    },
    setChatCategoryFailed: (
      state,
      action: PayloadAction<{ chatId: string }>
    ) => {
      const { chatId } = action.payload
      const previousCategory = state.pendingChatCategoryRollback[chatId]
      if (previousCategory === undefined) return
      delete state.pendingChatCategoryRollback[chatId]
      const existingChat = getChat(state, chatId)
      if (!existingChat || existingChat.is_blast) return
      const unreadCount = getDisplayedUnreadCount(state, chatId)
      adjustUnreadCountForChatCategory(state, existingChat, -unreadCount)
      adjustUnreadCountForChatCategory(
        state,
        { category: previousCategory, has_replied: existingChat.has_replied },
        unreadCount
      )
      chatsAdapter.updateOne(state.chats, {
        id: chatId,
        changes: { category: previousCategory }
      })
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
