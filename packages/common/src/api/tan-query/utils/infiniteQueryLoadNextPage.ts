import { useCallback } from 'react'

import { UseInfiniteQueryResult } from '@tanstack/react-query'

/**
 *  Helper method for infinite queries
 *
 *  By default, react-query does not have any system that prevents you from spamming page load requests.
 *  It's a real footgun.
 *
 *  Returns the in-flight `fetchNextPage` promise so callers (e.g.
 *  react-virtualized's InfiniteLoader) can await the load completing.
 *  Returns `undefined` when there is nothing to fetch — InfiniteLoader
 *  treats a missing return as "no load in progress".
 * @param queryData
 * @returns
 */
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

/**
 * `makeLoadNextPage` with a stable identity between page loads, so lineups
 * and lists that take it as a prop don't re-render on every parent render.
 */
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
