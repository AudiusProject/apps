import { EntityType } from '@audius/sdk'
import {
  DataTag,
  DefinedInitialDataOptions,
  QueryKey as TanQueryKey,
  UseInfiniteQueryResult,
  UseQueryOptions
} from '@tanstack/react-query'

import { ID } from '~/models'

import { makeLoadNextPage } from './utils/infiniteQueryLoadNextPage'

export type QueryKey<TData> = DataTag<TanQueryKey, TData, Error>

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

export type LineupData = { id: ID; type: EntityType; timestamp?: string }

export type LineupQueryData = Pick<
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
  'data'
> & {
  data: T[]
}
