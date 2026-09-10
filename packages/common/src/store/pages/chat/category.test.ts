import {
  ChatBlastAudience,
  ChatCategory,
  type TypedCommsResponse,
  type UserChat
} from '@audius/sdk'
import { describe, expect, it } from 'vitest'

import type { CommonState } from '~/store/reducers'

import {
  getChats,
  getChatsForInboxTab,
  getGeneralInboxChats,
  getHasUnreadGeneralMessages,
  getHasUnreadMessages,
  getHasUnreadPriorityMessages,
  getPriorityInboxChats,
  getUnreadMessagesCount,
  getUnreadMessagesCountByCategory
} from './selectors'
import chatReducer, { actions } from './slice'
import { InboxTab } from './types'
import { getInboxTabForChat } from './utils'

type ChatSummary = NonNullable<TypedCommsResponse<UserChat[]>['summary']>

const makeSummary = (): ChatSummary => ({
  prev_cursor: '2026-01-01T00:00:00.000Z',
  prev_count: 0,
  next_cursor: '2026-01-02T00:00:00.000Z',
  next_count: 0,
  total_count: 0
})

const makeChat = (
  chatId: string,
  overrides: Partial<UserChat> = {}
): UserChat => ({
  chat_id: chatId,
  last_message: 'hello',
  last_message_at: '2026-01-02T00:00:00.000Z',
  last_message_is_plaintext: true,
  chat_members: [],
  recheck_permissions: false,
  invite_code: '',
  unread_message_count: 0,
  last_read_at: '2026-01-02T00:00:00.000Z',
  cleared_history_at: '1970-01-01T00:00:00.000Z',
  is_blast: false,
  audience: ChatBlastAudience.FOLLOWERS,
  ...overrides
})

const seed = (chats: UserChat[]) =>
  chatReducer(
    undefined,
    actions.fetchMoreChatsSucceeded({ data: chats, summary: makeSummary() })
  )

const withServerCounts = (
  state: ReturnType<typeof chatReducer>,
  counts: { priority: number; general: number; uncategorized: number }
) =>
  chatReducer(
    state,
    actions.fetchUnreadMessagesCountSucceeded({
      unreadMessagesCount:
        counts.priority + counts.general + counts.uncategorized,
      unreadMessagesCountByCategory: counts
    })
  )

const asCommonState = (chat: ReturnType<typeof chatReducer>) =>
  ({ pages: { chat } }) as unknown as CommonState

/** The (non-blast) chat entity, narrowed so `category` is readable. */
const getUserChatEntity = (
  state: ReturnType<typeof chatReducer>,
  chatId: string
): UserChat | undefined => {
  const chat = state.chats.entities[chatId]
  return chat && !chat.is_blast ? chat : undefined
}

describe('chat categories', () => {
  describe('getInboxTabForChat', () => {
    it('puts uncategorized and priority chats in Priority, general in General', () => {
      expect(getInboxTabForChat(makeChat('a'))).toBe(InboxTab.PRIORITY)
      expect(getInboxTabForChat(makeChat('a', { category: null }))).toBe(
        InboxTab.PRIORITY
      )
      expect(
        getInboxTabForChat(makeChat('a', { category: ChatCategory.PRIORITY }))
      ).toBe(InboxTab.PRIORITY)
      expect(
        getInboxTabForChat(makeChat('a', { category: ChatCategory.GENERAL }))
      ).toBe(InboxTab.GENERAL)
    })
  })

  describe('setChatCategory', () => {
    it('optimistically moves the chat and confirms on success', () => {
      const seeded = seed([makeChat('chat-1')])
      const optimistic = chatReducer(
        seeded,
        actions.setChatCategory({
          chatId: 'chat-1',
          category: ChatCategory.GENERAL
        })
      )
      expect(getUserChatEntity(optimistic, 'chat-1')?.category).toBe(
        ChatCategory.GENERAL
      )
      expect(optimistic.pendingChatCategoryRollback['chat-1']).toBeNull()

      const confirmed = chatReducer(
        optimistic,
        actions.setChatCategorySucceeded({
          chatId: 'chat-1',
          category: ChatCategory.GENERAL
        })
      )
      expect(getUserChatEntity(confirmed, 'chat-1')?.category).toBe(
        ChatCategory.GENERAL
      )
      expect(confirmed.pendingChatCategoryRollback['chat-1']).toBeUndefined()
    })

    it('rolls back to the previous category on failure', () => {
      const seeded = seed([
        makeChat('chat-1', { category: ChatCategory.PRIORITY })
      ])
      const optimistic = chatReducer(
        seeded,
        actions.setChatCategory({
          chatId: 'chat-1',
          category: ChatCategory.GENERAL
        })
      )
      const rolledBack = chatReducer(
        optimistic,
        actions.setChatCategoryFailed({ chatId: 'chat-1' })
      )
      expect(getUserChatEntity(rolledBack, 'chat-1')?.category).toBe(
        ChatCategory.PRIORITY
      )
      expect(rolledBack.pendingChatCategoryRollback['chat-1']).toBeUndefined()
    })

    it('re-asserts the confirmed category if a refetch clobbered it', () => {
      const seeded = seed([makeChat('chat-1')])
      const optimistic = chatReducer(
        seeded,
        actions.setChatCategory({
          chatId: 'chat-1',
          category: ChatCategory.GENERAL
        })
      )
      // A concurrent list refetch returns the stale (uncategorized) chat;
      // the server always sends an explicit null for uncategorized.
      const clobbered = chatReducer(
        optimistic,
        actions.fetchMoreChatsSucceeded({
          data: [makeChat('chat-1', { category: null })],
          summary: makeSummary()
        })
      )
      expect(getUserChatEntity(clobbered, 'chat-1')?.category).toBeNull()
      const confirmed = chatReducer(
        clobbered,
        actions.setChatCategorySucceeded({
          chatId: 'chat-1',
          category: ChatCategory.GENERAL
        })
      )
      expect(getUserChatEntity(confirmed, 'chat-1')?.category).toBe(
        ChatCategory.GENERAL
      )
    })

    it('moves unread messages between category buckets', () => {
      const seeded = withServerCounts(
        seed([makeChat('chat-1', { unread_message_count: 3 })]),
        { priority: 0, general: 0, uncategorized: 3 }
      )
      const moved = chatReducer(
        seeded,
        actions.setChatCategory({
          chatId: 'chat-1',
          category: ChatCategory.GENERAL
        })
      )
      expect(getUnreadMessagesCountByCategory(asCommonState(moved))).toEqual({
        priority: 0,
        general: 3,
        uncategorized: 0
      })
      const rolledBack = chatReducer(
        moved,
        actions.setChatCategoryFailed({ chatId: 'chat-1' })
      )
      expect(
        getUnreadMessagesCountByCategory(asCommonState(rolledBack))
      ).toEqual({ priority: 0, general: 0, uncategorized: 3 })
    })

    it('ignores blasts', () => {
      const blastId = 'follower_audience'
      const seeded = chatReducer(
        undefined,
        actions.fetchMoreChatsSucceeded({
          data: [
            {
              chat_id: blastId,
              is_blast: true,
              last_message_at: '2026-01-02T00:00:00.000Z',
              audience: ChatBlastAudience.FOLLOWERS
            } as unknown as UserChat
          ],
          summary: makeSummary()
        })
      )
      const next = chatReducer(
        seeded,
        actions.setChatCategory({
          chatId: blastId,
          category: ChatCategory.GENERAL
        })
      )
      expect(next.pendingChatCategoryRollback[blastId]).toBeUndefined()
      expect(getGeneralInboxChats(asCommonState(next))).toHaveLength(0)
    })
  })

  describe('per-category unread counts', () => {
    it('decrements the right bucket when a chat is read', () => {
      const seeded = withServerCounts(
        seed([
          makeChat('general-1', {
            category: ChatCategory.GENERAL,
            unread_message_count: 2
          }),
          makeChat('new-1', { unread_message_count: 1 })
        ]),
        { priority: 0, general: 2, uncategorized: 1 }
      )
      const optimistic = chatReducer(
        seeded,
        actions.markChatAsRead({ chatId: 'general-1' })
      )
      expect(
        getUnreadMessagesCountByCategory(asCommonState(optimistic))
      ).toEqual({ priority: 0, general: 0, uncategorized: 1 })
      expect(getHasUnreadGeneralMessages(asCommonState(optimistic))).toBe(false)
      expect(getHasUnreadPriorityMessages(asCommonState(optimistic))).toBe(true)

      const confirmed = chatReducer(
        optimistic,
        actions.markChatAsReadSucceeded({ chatId: 'general-1' })
      )
      expect(confirmed.unreadMessagesCountByCategory).toEqual({
        priority: 0,
        general: 0,
        uncategorized: 1
      })
      expect(confirmed.optimisticUnreadMessagesCountByCategory).toBeUndefined()
    })

    it('bumps the bucket of the chat a new message arrives in', () => {
      const seeded = withServerCounts(
        seed([makeChat('general-1', { category: ChatCategory.GENERAL })]),
        { priority: 0, general: 0, uncategorized: 0 }
      )
      const next = chatReducer(
        seeded,
        actions.addMessage({
          chatId: 'general-1',
          isSelfMessage: false,
          message: {
            message_id: 'm1',
            chat_id: 'general-1',
            sender_user_id: '7',
            created_at: '2026-01-03T00:00:00.000Z',
            message: 'hi',
            reactions: []
          } as any
        })
      )
      expect(getUnreadMessagesCountByCategory(asCommonState(next))).toEqual({
        priority: 0,
        general: 1,
        uncategorized: 0
      })
      expect(getHasUnreadGeneralMessages(asCommonState(next))).toBe(true)
      expect(getHasUnreadPriorityMessages(asCommonState(next))).toBe(false)
    })

    it('clears every bucket when all chats are marked read', () => {
      const seeded = withServerCounts(
        seed([makeChat('chat-1', { unread_message_count: 4 })]),
        { priority: 1, general: 2, uncategorized: 4 }
      )
      const next = chatReducer(seeded, actions.markAllChatsAsRead())
      expect(getUnreadMessagesCountByCategory(asCommonState(next))).toEqual({
        priority: 0,
        general: 0,
        uncategorized: 0
      })
      const confirmed = chatReducer(next, actions.markAllChatsAsReadSucceeded())
      expect(confirmed.unreadMessagesCountByCategory).toEqual({
        priority: 0,
        general: 0,
        uncategorized: 0
      })
    })

    it('falls back to loaded chats when the server has no breakdown', () => {
      const seeded = seed([
        makeChat('general-1', {
          category: ChatCategory.GENERAL,
          unread_message_count: 1
        }),
        makeChat('priority-1', { category: ChatCategory.PRIORITY })
      ])
      const state = asCommonState(seeded)
      expect(getUnreadMessagesCountByCategory(state)).toBeUndefined()
      expect(getHasUnreadGeneralMessages(state)).toBe(true)
      expect(getHasUnreadPriorityMessages(state)).toBe(false)
    })
  })

  describe('nav dot (getHasUnreadMessages)', () => {
    it('fires for unread General messages via the server count', () => {
      const seeded = withServerCounts(
        seed([
          makeChat('general-1', {
            category: ChatCategory.GENERAL,
            unread_message_count: 1
          })
        ]),
        { priority: 0, general: 1, uncategorized: 0 }
      )
      expect(getHasUnreadMessages(asCommonState(seeded))).toBe(true)
      expect(getUnreadMessagesCount(asCommonState(seeded))).toBe(1)
    })

    it('fires for an unread General chat listed after a blast', () => {
      const blast = {
        chat_id: 'follower_audience',
        is_blast: true,
        last_message_at: '2026-01-03T00:00:00.000Z',
        audience: ChatBlastAudience.FOLLOWERS
      } as unknown as UserChat
      const seeded = seed([
        blast,
        makeChat('general-1', {
          category: ChatCategory.GENERAL,
          unread_message_count: 1
        })
      ])
      // No server count yet: the fallback scan must not stop at the blast
      expect(getChats(asCommonState(seeded))[0].chat_id).toBe(blast.chat_id)
      expect(getHasUnreadMessages(asCommonState(seeded))).toBe(true)
    })

    it('goes quiet once the General chat is read', () => {
      const seeded = withServerCounts(
        seed([
          makeChat('general-1', {
            category: ChatCategory.GENERAL,
            unread_message_count: 1
          })
        ]),
        { priority: 0, general: 1, uncategorized: 0 }
      )
      const read = chatReducer(
        seeded,
        actions.markChatAsReadSucceeded({ chatId: 'general-1' })
      )
      expect(getHasUnreadMessages(asCommonState(read))).toBe(false)
    })
  })

  describe('inbox tab selectors', () => {
    it('splits chats between the Priority and General tabs', () => {
      const state = asCommonState(
        seed([
          makeChat('new-1'),
          makeChat('priority-1', { category: ChatCategory.PRIORITY }),
          makeChat('general-1', { category: ChatCategory.GENERAL })
        ])
      )
      expect(getPriorityInboxChats(state).map((c) => c.chat_id)).toEqual([
        'new-1',
        'priority-1'
      ])
      expect(getGeneralInboxChats(state).map((c) => c.chat_id)).toEqual([
        'general-1'
      ])
      expect(getChatsForInboxTab(state, InboxTab.GENERAL)).toBe(
        getGeneralInboxChats(state)
      )
    })
  })
})
