import {
  UseQueryResult,
  RefetchOptions,
  QueryObserverResult
} from '@tanstack/react-query'
import { sumBy } from 'lodash'

import { Status } from '~/models'

export const combineQueryStatuses = (
  queries: Pick<
    UseQueryResult<any, Error>,
    'isPending' | 'isFetching' | 'isLoading' | 'isSuccess' | 'isError'
  >[]
) => {
  const isPending = queries.some((query) => query.isPending)
  const isFetching = queries.some((query) => query.isFetching)
  const isLoading = queries.some((query) => query.isLoading)
  const isSuccess = queries.every((query) => query.isSuccess)
  const isError = queries.some((query) => query.isError)
  const status = isPending
    ? Status.LOADING
    : isError
      ? Status.ERROR
      : isSuccess
        ? Status.SUCCESS
        : Status.IDLE

  return {
    isPending,
    isFetching,
    isLoading,
    isSuccess,
    isError,
    status
  }
}

export const combineQueryResults = <T>(
  queries: UseQueryResult<T, Error>[]
): UseQueryResult<T, Error> => {
  const { isPending, isFetching, isLoading, isSuccess, isError } =
    combineQueryStatuses(queries)

  const isFetched = queries.every((query) => query.isFetched)
  const isFetchedAfterMount = queries.every(
    (query) => query.isFetchedAfterMount
  )
  const isPlaceholderData = queries.some((query) => query.isPlaceholderData)

  const error = queries.find((query) => query.error)?.error ?? null
  const errorUpdatedAt = queries.reduce((latest, query) => {
    const currentTime = query.errorUpdatedAt
    if (!currentTime) return latest
    if (!latest) return currentTime
    return currentTime > latest ? currentTime : latest
  }, 0)

  const dataUpdatedAt = queries.reduce((latest, query) => {
    const currentTime = query.dataUpdatedAt
    if (!currentTime) return latest
    if (!latest) return currentTime
    return currentTime > latest ? currentTime : latest
  }, 0)

  let status: 'pending' | 'error' | 'success' = 'success'
  if (isPending) status = 'pending'
  if (isError) status = 'error'

  const refetch = async (
    options?: RefetchOptions
  ): Promise<QueryObserverResult<T | undefined, Error>> => {
    const results = await Promise.all(
      queries.map((query) => query.refetch(options))
    )
    return {
      ...results[0],
      data: undefined
    } as QueryObserverResult<T | undefined, Error>
  }

  const promise = Promise.all(queries.map((q) => q.promise)).then(
    () => undefined
  ) as Promise<T | undefined>

  const result = {
    data: !isPending
      ? queries.filter((q) => q.data).map((q) => q.data)
      : undefined,
    error: error as Error,
    isError,
    isFetching,
    isLoading,
    isPending,
    isSuccess,
    status,
    dataUpdatedAt,
    errorUpdatedAt,
    failureCount: sumBy(queries, (q) => q.failureCount ?? 0),
    failureReason: isError ? error : null,
    errorUpdateCount: sumBy(queries, (q) => q.errorUpdateCount ?? 0),
    fetchStatus: isFetching ? 'fetching' : 'idle',
    isLoadingError: queries.some((q) => q.isLoadingError),
    isPaused: queries.some((q) => q.isPaused),
    isRefetchError: queries.some((q) => q.isRefetchError),
    isRefetching: queries.some((q) => q.isRefetching),
    isStale: queries.some((q) => q.isStale),
    isFetched,
    isFetchedAfterMount,
    isPlaceholderData,
    refetch,
    promise
  } as UseQueryResult<T | undefined>

  return result as UseQueryResult<T, Error>
}
