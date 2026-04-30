import {
  ChatBlastAudience,
  type TypedCommsResponse,
  type UserChat
} from '@audius/sdk'
import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { describe, expect, it, vitest } from 'vitest'

import { queryCurrentUserId, queryUsers } from '~/api'

import { doFetchLatestChats } from './sagas'
import { actions } from './slice'

type ChatSummary = NonNullable<TypedCommsResponse<UserChat[]>['summary']>

const makeSummary = (overrides: Partial<ChatSummary> = {}): ChatSummary => ({
  prev_cursor: '2026-01-01T00:00:00.000Z',
  prev_count: 0,
  next_cursor: '2026-01-02T00:00:00.000Z',
  next_count: 0,
  total_count: 0,
  ...overrides
})

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

const makeResponse = (
  data: UserChat[],
  summary: ChatSummary
): TypedCommsResponse<UserChat[]> => ({
  health: { is_healthy: true },
  data,
  summary
})

const missingCursor = undefined as unknown as string

const runSagaWithResponses = async (
  responses: TypedCommsResponse<UserChat[]>[],
  expectedSummary: ChatSummary
) => {
  const getAll = vitest.fn()
  responses.forEach((response) => {
    getAll.mockResolvedValueOnce(response)
  })
  const sdk = { chats: { getAll } }
  const audiusSdk = vitest.fn().mockResolvedValue(sdk)
  const expectedData = responses.flatMap((response) => response.data)

  await expectSaga(doFetchLatestChats)
    .withState({ pages: { chat: { chats: { summary: undefined } } } })
    .provide([
      [matchers.getContext('audiusSdk'), audiusSdk],
      [matchers.call.fn(queryCurrentUserId), 1],
      [matchers.call.fn(queryUsers), undefined]
    ])
    .put(
      actions.fetchMoreChatsSucceeded({
        data: expectedData,
        summary: expectedSummary
      })
    )
    .silentRun()

  return getAll
}

describe('chat sagas', () => {
  describe('doFetchLatestChats', () => {
    it('stops after one response when prev_count is 0', async () => {
      const response = makeResponse(
        [makeChat('chat-1')],
        makeSummary({
          prev_cursor: 'cursor-1',
          prev_count: 0,
          next_cursor: 'next-1',
          next_count: 2
        })
      )

      const getAll = await runSagaWithResponses([response], response.summary!)

      expect(getAll).toHaveBeenCalledTimes(1)
    })

    it('uses first next cursor and last prev cursor after multiple pages', async () => {
      const first = makeResponse(
        [makeChat('chat-1')],
        makeSummary({
          prev_cursor: 'cursor-1',
          prev_count: 1,
          next_cursor: 'next-1',
          next_count: 3
        })
      )
      const last = makeResponse(
        [makeChat('chat-2')],
        makeSummary({
          prev_cursor: missingCursor,
          prev_count: 0,
          next_cursor: 'next-older',
          next_count: 1
        })
      )

      const getAll = await runSagaWithResponses(
        [first, last],
        makeSummary({
          ...first.summary!,
          prev_cursor: last.summary!.prev_cursor,
          prev_count: last.summary!.prev_count
        })
      )

      expect(getAll).toHaveBeenCalledTimes(2)
      expect(getAll.mock.calls[1][0]).toMatchObject({ before: 'cursor-1' })
    })

    it('stops when a non-empty page has no prev cursor', async () => {
      const response = makeResponse(
        [makeChat('chat-1')],
        makeSummary({
          prev_cursor: missingCursor,
          prev_count: 10,
          next_cursor: 'next-1',
          next_count: 2
        })
      )

      const getAll = await runSagaWithResponses([response], response.summary!)

      expect(getAll).toHaveBeenCalledTimes(1)
    })

    it('stops when the prev cursor does not advance', async () => {
      const first = makeResponse(
        [makeChat('chat-1')],
        makeSummary({
          prev_cursor: 'cursor-1',
          prev_count: 2,
          next_cursor: 'next-1',
          next_count: 3
        })
      )
      const last = makeResponse(
        [makeChat('chat-2')],
        makeSummary({
          prev_cursor: 'cursor-1',
          prev_count: 1,
          next_cursor: 'next-older',
          next_count: 1
        })
      )

      const getAll = await runSagaWithResponses(
        [first, last],
        makeSummary({
          ...first.summary!,
          prev_cursor: last.summary!.prev_cursor,
          prev_count: last.summary!.prev_count
        })
      )

      expect(getAll).toHaveBeenCalledTimes(2)
    })
  })
})
