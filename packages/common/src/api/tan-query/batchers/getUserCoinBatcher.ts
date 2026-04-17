import { Id, UserCoinWithAccounts } from '@audius/sdk'
import { create, windowScheduler } from '@yornaath/batshit'
import { memoize } from 'lodash'

import { ID } from '~/models'

import { getUserCoinQueryKey } from '../coins/userCoinQueryKey'

import { contextCacheResolver } from './contextCacheResolver'
import { BatchContext } from './types'

export type UserCoinBatchQuery = {
  userId: ID
  mint: string
}

const queryKey = (q: UserCoinBatchQuery) => `${q.userId}\u0000${q.mint}`

export const getUserCoinBatcher = memoize(
  (context: BatchContext) =>
    create({
      name: 'getUserCoinBatcher',
      fetcher: async (
        queries: UserCoinBatchQuery[]
      ): Promise<Map<string, UserCoinWithAccounts | null>> => {
        const { sdk, queryClient } = context
        if (!queries.length) {
          return new Map()
        }

        const uniqueByKey = new Map<string, UserCoinBatchQuery>()
        for (const q of queries) {
          uniqueByKey.set(queryKey(q), q)
        }
        const unique = [...uniqueByKey.values()]

        const results = await Promise.all(
          unique.map(async ({ userId, mint }) => {
            const response = await sdk.users.getUserCoin({
              id: Id.parse(userId),
              mint
            })
            return response.data ?? null
          })
        )

        const byKey = new Map<string, UserCoinWithAccounts | null>()
        unique.forEach((q, i) => {
          const key = queryKey(q)
          const value = results[i]
          byKey.set(key, value)
          queryClient.setQueryData(getUserCoinQueryKey(q.mint, q.userId), value)
        })

        return byKey
      },
      resolver: (
        items: Map<string, UserCoinWithAccounts | null>,
        query: UserCoinBatchQuery
      ) => items.get(queryKey(query)) ?? null,
      scheduler: windowScheduler(10)
    }),
  contextCacheResolver()
)
