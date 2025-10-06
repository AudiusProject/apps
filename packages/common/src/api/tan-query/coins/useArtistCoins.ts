import { GetCoinsSortMethodEnum, GetCoinsSortDirectionEnum } from '@audius/sdk'
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryOptions
} from '@tanstack/react-query'

import { coinListFromSDK, Coin } from '~/adapters/coin'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'
import { useQueryContext } from '../utils/QueryContext'

import { getArtistCoinQueryKey } from './useArtistCoin'

export type UseArtistCoinsListParams = {
  limit?: number
  offset?: number
  sortMethod?: GetCoinsSortMethodEnum
  sortDirection?: GetCoinsSortDirectionEnum
  query?: string
}

const DEFAULT_PAGE_SIZE = 25

export const getArtistCoinsListQueryKey = (params?: UseArtistCoinsListParams) =>
  [QUERY_KEYS.coins, 'list', params] as unknown as QueryKey<Coin[]>

export const useArtistCoinsList = <TResult = Coin[]>(
  params: UseArtistCoinsListParams = {},
  options?: SelectableQueryOptions<Coin[], TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: getArtistCoinsListQueryKey(params),
    queryFn: async () => {
      const sdk = await audiusSdk()

      const response = await sdk.coins.getCoins({
        limit: params.limit,
        offset: params.offset,
        sortMethod: params.sortMethod,
        sortDirection: params.sortDirection,
        query: params.query
      })

      const coins = response?.data
      const parsedCoins = coinListFromSDK(coins)

      // Prime individual coin data for each mint
      if (parsedCoins) {
        parsedCoins.forEach((coin) => {
          if (coin.mint) {
            queryClient.setQueryData(getArtistCoinQueryKey(coin.mint), coin)
          }
        })
      }

      return parsedCoins
    },
    ...options,
    enabled: options?.enabled !== false
  })
}

export type UseArtistCoinsParams = {
  pageSize?: number
  sortMethod?: GetCoinsSortMethodEnum
  sortDirection?: GetCoinsSortDirectionEnum
  query?: string
}

export const getArtistCoinsQueryKey = (params?: UseArtistCoinsParams) =>
  [QUERY_KEYS.coins, 'infinite', params] as unknown as QueryKey<
    InfiniteData<Coin[], number>
  >

export const useArtistCoins = (
  params: UseArtistCoinsParams = {},
  options?: Omit<
    UseInfiniteQueryOptions<
      Coin[],
      Error,
      Coin[],
      Coin[],
      QueryKey<InfiniteData<Coin[], number>>,
      number
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam' | 'select'
  >
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE

  return useInfiniteQuery({
    queryKey: getArtistCoinsQueryKey(params),
    queryFn: async ({ pageParam = 0 }) => {
      const sdk = await audiusSdk()

      const response = await sdk.coins.getCoins({
        limit: pageSize,
        offset: pageParam,
        sortMethod: params.sortMethod,
        sortDirection: params.sortDirection,
        query: params.query
      })

      const coins = response?.data
      const parsedCoins = coinListFromSDK(coins)

      // Prime individual coin data for each mint
      if (parsedCoins) {
        parsedCoins.forEach((coin) => {
          if (coin.mint) {
            queryClient.setQueryData(getArtistCoinQueryKey(coin.mint), coin)
          }
        })
      }

      return parsedCoins ?? []
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer items than the page size, we've reached the end
      if (lastPage.length < pageSize) {
        return undefined
      }
      // Otherwise, return the next offset
      return allPages.length * pageSize
    },
    enabled: options?.enabled !== false,
    select: (data) => data.pages.flat(),
    ...options
  })
}

// Export enum types for use in other components
export { GetCoinsSortMethodEnum, GetCoinsSortDirectionEnum }
