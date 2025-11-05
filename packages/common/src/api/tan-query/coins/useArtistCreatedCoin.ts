import { Id } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { coinListFromSDK, Coin } from '~/adapters/coin'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useQueryContext } from '../utils/QueryContext'

import { getArtistCoinQueryKey } from './useArtistCoin'

export const getArtistCreatedCoinQueryKey = (ownerId: ID | null | undefined) =>
  [QUERY_KEYS.coins, 'created', ownerId] as unknown as QueryKey<Coin | null>

export const useArtistCreatedCoin = <TResult = Coin | null>(
  ownerId: ID | null | undefined,
  options?: SelectableQueryOptions<Coin | null, TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: getArtistCreatedCoinQueryKey(ownerId),
    queryFn: async () => {
      if (!ownerId) {
        return null
      }

      const sdk = await audiusSdk()

      // Encode owner_id param to match API expectations
      const encodedOwnerId = Id.parse(ownerId)

      const response = await sdk.coins.getCoins({
        ownerId: [encodedOwnerId]
      })

      const coins = response?.data
      const parsedCoins = coinListFromSDK(coins)

      // Prime individual coin data for each mint
      if (parsedCoins && parsedCoins.length > 0) {
        const coin = parsedCoins[0] // Get the first (and only) coin
        if (coin.mint) {
          queryClient.setQueryData(getArtistCoinQueryKey(coin.mint), coin)
        }
        return coin
      }

      return null
    },
    ...options,
    enabled: !!ownerId && options?.enabled !== false
  })
}
