import { EntityType } from '@audius/sdk'
import {
  DataTag,
  DefinedInitialDataOptions,
  QueryKey as TanQueryKey,
  UseInfiniteQueryResult,
  UseQueryOptions
} from '@tanstack/react-query'

import { ID } from '~/models'

import { UseLineupQueryData } from './lineups/useLineupQuery'
import { makeLoadNextPage } from './utils/infiniteQueryLoadNextPage'

/**
 * Using DataTag allows tan-query to infer the data type stored at this key
 * TData is the type of the data stored at this key
 */
export type QueryKey<TData> = DataTag<TanQueryKey, TData, Error>

/**
 * Standard tan-query pass-thru options that we use
 */
export type QueryOptions<T = any> = Pick<
  DefinedInitialDataOptions<T>,
  | 'staleTime'
  | 'enabled'
  | 'placeholderData'
  | 'refetchOnMount'
  | 'throwOnError'
  | 'refetchInterval'
  | 'refetchOnWindowFocus'
>

export type SelectableQueryOptions<TData, TResult = TData> = Omit<
  UseQueryOptions<TData, Error, TResult>,
  'queryKey' | 'queryFn'
>

export type LineupData = { id: ID; type: EntityType }

export type LineupQueryData = UseLineupQueryData &
  Pick<
    UseInfiniteQueryResult,
    | 'data'
    | 'hasNextPage'
    | 'isInitialLoading'
    | 'isLoading'
    | 'isPending'
    | 'isError'
  > & {
    loadNextPage: ReturnType<typeof makeLoadNextPage>
    pageSize?: number
  }

export type FlatUseInfiniteQueryResult<T> = Omit<
  UseInfiniteQueryResult,
  'data' // These types get invalidated by the select modifier changing the output shape
> & {
  data: T[]
}
