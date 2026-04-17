import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useQueryContext } from '../utils/QueryContext'

export const getFanClubHoldersCountQueryKey = (currentUserId?: number | null) =>
  [QUERY_KEYS.fanClubHoldersCount, currentUserId] as unknown as QueryKey<number>

export const useFanClubHoldersCount = (options?: QueryOptions) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getFanClubHoldersCountQueryKey(currentUserId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      if (!currentUserId) return 0

      const coinsResponse = await sdk.coins.getCoins({
        ownerId: [Id.parse(currentUserId)]
      })

      const userCoin = coinsResponse?.data?.[0]
      if (!userCoin?.mint) return 0

      const insightsResponse = await sdk.coins.getCoinInsights({
        mint: userCoin.mint
      })

      return insightsResponse?.data?.holder
    },
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}
