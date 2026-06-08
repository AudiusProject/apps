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

import { getFanClubQueryKey } from './useFanClub'

export type UseFanClubsListParams = {
  limit?: number
  offset?: number
  sortMethod?: GetCoinsSortMethodEnum
  sortDirection?: GetCoinsSortDirectionEnum
  query?: string
}

const DEFAULT_PAGE_SIZE = 25

export const getFanClubsListQueryKey = (params?: UseFanClubsListParams) =>
  [QUERY_KEYS.coins, 'list', params] as unknown as QueryKey<Coin[]>

export const useFanClubsList = <TResult = Coin[]>(
  params: UseFanClubsListParams = {},
  options?: SelectableQueryOptions<Coin[], TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: getFanClubsListQueryKey(params),
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
            queryClient.setQueryData(getFanClubQueryKey(coin.mint), coin)
          }
        })
      }

      return parsedCoins
    },
    ...options,
    enabled: options?.enabled !== false
  })
}

export type UseFanClubsParams = {
  pageSize?: number
  sortMethod?: GetCoinsSortMethodEnum
  sortDirection?: GetCoinsSortDirectionEnum
  query?: string
}

export const getFanClubsQueryKey = (params?: UseFanClubsParams) =>
  [QUERY_KEYS.coins, params] as unknown as QueryKey<
    InfiniteData<Coin[], number>
  >

export const useFanClubs = <TData = Coin[]>(
  params: UseFanClubsParams = {},
  options?: Omit<
    UseInfiniteQueryOptions<
      Coin[],
      Error,
      TData,
      Coin[],
      QueryKey<InfiniteData<Coin[], number>>,
      number
    >,
    'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
  >
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE

  return useInfiniteQuery({
    queryKey: getFanClubsQueryKey(params),
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
            queryClient.setQueryData(getFanClubQueryKey(coin.mint), coin)
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
    select: options?.select ?? ((data) => data.pages.flat() as TData),
    ...options
  })
}

// Export enum types for use in other components
export { GetCoinsSortMethodEnum, GetCoinsSortDirectionEnum }
