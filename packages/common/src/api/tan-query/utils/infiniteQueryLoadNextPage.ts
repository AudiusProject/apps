import { useCallback } from 'react'

import { UseInfiniteQueryResult } from '@tanstack/react-query'

export const makeLoadNextPage =
  (
    queryData: Pick<
      UseInfiniteQueryResult,
      'isFetching' | 'hasNextPage' | 'fetchNextPage'
    >
  ) =>
  () => {
    if (queryData.isFetching || !queryData.hasNextPage) return undefined
    return queryData.fetchNextPage()
  }

export const useLoadNextPage = ({
  isFetching,
  hasNextPage,
  fetchNextPage
}: Pick<
  UseInfiniteQueryResult,
  'isFetching' | 'hasNextPage' | 'fetchNextPage'
>) =>
  useCallback(
    () => makeLoadNextPage({ isFetching, hasNextPage, fetchNextPage })(),
    [isFetching, hasNextPage, fetchNextPage]
  )
