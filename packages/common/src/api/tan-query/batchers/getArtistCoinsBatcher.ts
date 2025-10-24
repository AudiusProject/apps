import { Coin } from '@audius/sdk'
import { create, keyResolver, windowScheduler } from '@yornaath/batshit'
import { memoize } from 'lodash'

import { QUERY_KEYS } from '../queryKeys'

import { contextCacheResolver } from './contextCacheResolver'
import { BatchContext } from './types'

export const getArtistCoinsBatcher = memoize(
  (context: BatchContext) =>
    create({
      fetcher: async (mints: string[]): Promise<Coin[]> => {
        const { sdk, queryClient } = context
        if (!mints.length) return []

        const { data: coins } = await sdk.coins.getCoins({
          mint: mints
        })

        // Prime individual coin data
        coins.forEach((coin) => {
          if (!coin.mint) return
          const queryKey = [QUERY_KEYS.coin, coin.mint]
          if (!queryClient.getQueryData(queryKey)) {
            queryClient.setQueryData(queryKey, coin)
          }
        })

        return coins
      },
      resolver: keyResolver('mint'),
      scheduler: windowScheduler(10)
    }),
  contextCacheResolver()
)
