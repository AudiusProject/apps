import {
  ChatBlastAudience,
  type ChatMessage,
  type TypedCommsResponse,
  type UserChat
} from '@audius/sdk'
import { describe, expect, it } from 'vitest'

import chatReducer, { actions } from './slice'

type ChatSummary = NonNullable<TypedCommsResponse<UserChat[]>['summary']>
type MessageSummary = NonNullable<TypedCommsResponse<ChatMessage[]>['summary']>

const missingCursor = undefined as unknown as string

const makeSummary = <T extends ChatSummary | MessageSummary>(
  overrides: Partial<T> = {}
): T =>
  ({
    prev_cursor: '2026-01-01T00:00:00.000Z',
    prev_count: 0,
    next_cursor: '2026-01-02T00:00:00.000Z',
    next_count: 0,
    total_count: 0,
    ...overrides
  }) as T

const makeChat = (chatId: string): UserChat => ({
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
  audience: ChatBlastAudience.FOLLOWERS
})

const seedChat = (chatId: string) =>
  chatReducer(
    undefined,
    actions.fetchMoreChatsSucceeded({
      data: [makeChat(chatId)],
      summary: makeSummary<ChatSummary>()
    })
  )

describe('chat slice', () => {
  it('converges chat pagination counts to 0 without clobbering cursors', () => {
    const initialSummary = makeSummary<ChatSummary>({
      next_cursor: '2026-01-10T00:00:00.000Z',
      next_count: 5,
      prev_cursor: '2026-01-01T00:00:00.000Z',
      prev_count: 5
    })
    const seeded = chatReducer(
      undefined,
      actions.fetchMoreChatsSucceeded({
        data: [makeChat('chat-1')],
        summary: initialSummary
      })
    )

    const next = chatReducer(
      seeded,
      actions.fetchMoreChatsSucceeded({
        data: [],
        summary: makeSummary<ChatSummary>({
          next_cursor: missingCursor,
          next_count: 0,
          prev_cursor: missingCursor,
          prev_count: 0
        })
      })
    )

    expect(next.chats.summary?.next_count).toBe(0)
    expect(next.chats.summary?.prev_count).toBe(0)
    expect(next.chats.summary?.next_cursor).toBe(initialSummary.next_cursor)
    expect(next.chats.summary?.prev_cursor).toBe(initialSummary.prev_cursor)
  })

  it('ignores missing message cursors with nonzero counts', () => {
    const chatId = 'chat-1'
    const initialSummary = makeSummary<MessageSummary>({
      next_cursor: '2000-01-01T00:00:00.000Z',
      next_count: 7,
      prev_cursor: '2999-01-01T00:00:00.000Z',
      prev_count: 7
    })
    const seeded = chatReducer(
      seedChat(chatId),
      actions.fetchMoreMessagesSucceeded({
        chatId,
        response: { data: [], summary: initialSummary }
      })
    )

    const next = chatReducer(
      seeded,
      actions.fetchMoreMessagesSucceeded({
        chatId,
        response: {
          data: [],
          summary: makeSummary<MessageSummary>({
            next_cursor: missingCursor,
            next_count: 3,
            prev_cursor: missingCursor,
            prev_count: 3
          })
        }
      })
    )

    const summary = next.chats.entities[chatId]?.messagesSummary
    expect(summary?.next_count).toBe(initialSummary.next_count)
    expect(summary?.prev_count).toBe(initialSummary.prev_count)
    expect(summary?.next_cursor).toBe(initialSummary.next_cursor)
    expect(summary?.prev_cursor).toBe(initialSummary.prev_cursor)
  })

  it('converges message pagination counts to 0 without clobbering cursors', () => {
    const chatId = 'chat-1'
    const initialSummary = makeSummary<MessageSummary>({
      next_cursor: '2026-01-10T00:00:00.000Z',
      next_count: 5,
      prev_cursor: '2026-01-01T00:00:00.000Z',
      prev_count: 5
    })
    const seeded = chatReducer(
      seedChat(chatId),
      actions.fetchMoreMessagesSucceeded({
        chatId,
        response: { data: [], summary: initialSummary }
      })
    )

    const next = chatReducer(
      seeded,
      actions.fetchMoreMessagesSucceeded({
        chatId,
        response: {
          data: [],
          summary: makeSummary<MessageSummary>({
            next_cursor: missingCursor,
            next_count: 0,
            prev_cursor: missingCursor,
            prev_count: 0
          })
        }
      })
    )

    const summary = next.chats.entities[chatId]?.messagesSummary
    expect(summary?.next_count).toBe(0)
    expect(summary?.prev_count).toBe(0)
    expect(summary?.next_cursor).toBe(initialSummary.next_cursor)
    expect(summary?.prev_cursor).toBe(initialSummary.prev_cursor)
  })
})
