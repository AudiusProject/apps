import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { AnyAction, Dispatch } from 'redux'

import { coinFromSdk, Coin } from '~/adapters/coin'

import { getArtistCoinsBatcher } from '../batchers/getArtistCoinsBatcher'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useQueryContext } from '../utils'
import { entityCacheOptions } from '../utils/entityCacheOptions'

export const getArtistCoinQueryKey = (mint: string | null | undefined) =>
  [QUERY_KEYS.coin, mint] as unknown as QueryKey<Coin | undefined>

export const getArtistCoinByTickerQueryKey = (ticker: string) =>
  [QUERY_KEYS.coinByTicker, ticker] as unknown as QueryKey<string>

export const getArtistCoinQueryFn = async (
  mint: string,
  queryClient: QueryClient,
  sdk: any,
  dispatch: Dispatch<AnyAction>
) => {
  const batchGetCoins = getArtistCoinsBatcher({
    sdk,
    currentUserId: null,
    queryClient,
    dispatch
  })
  const coins = await batchGetCoins.fetch(mint)
  return coins
}

export const useArtistCoin = <TResult = Coin | undefined>(
  mint: string | null | undefined,
  options?: SelectableQueryOptions<Coin | undefined, TResult>
) => {
  const { audiusSdk, env } = useQueryContext()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: getArtistCoinQueryKey(mint),
    queryFn: async () => {
      const coin = await getArtistCoinQueryFn(
        mint!,
        queryClient,
        await audiusSdk(),
        dispatch
      )

      const parsedCoin = coinFromSdk(coin)

      // Prime the ticker query key if we have coin data with ticker
      if (parsedCoin?.ticker) {
        queryClient.setQueryData(
          getArtistCoinByTickerQueryKey(parsedCoin.ticker),
          parsedCoin.mint
        )
      }

      return parsedCoin
    },
    ...options,
    ...entityCacheOptions,
    enabled:
      options?.enabled !== false && !!mint && mint !== env.USDC_MINT_ADDRESS
  })
}
