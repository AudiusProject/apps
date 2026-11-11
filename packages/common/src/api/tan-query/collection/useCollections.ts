import { useMemo } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { keyBy } from 'lodash'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { ID } from '~/models'

import { TQCollection } from '../models'
import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { combineQueryResults } from '../utils/combineQueryResults'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { useQueries } from '../utils/useQueries'

import { getCollectionQueryKey, getCollectionQueryFn } from './useCollection'

export const useCollections = (
  collectionIds: ID[] | null | undefined,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  // Callers often pass a new array each render, so key on the ids themselves
  // to keep the queries below stable.
  const collectionIdsKey = collectionIds?.join(',')
  const uniqueCollectionIds = useMemo(
    () =>
      collectionIds?.filter(
        (id, index, self) => self.indexOf(id) === index && !!id
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionIdsKey]
  )

  // Rebuilding these every render makes tanstack re-hash every key and
  // re-sync every observer, so only rebuild when an input changes.
  const queries = useMemo(
    () =>
      uniqueCollectionIds?.map((collectionId) => ({
        queryKey: getCollectionQueryKey(collectionId),
        queryFn: async () => {
          const sdk = await audiusSdk()
          return getCollectionQueryFn(
            collectionId,
            currentUserId,
            queryClient,
            sdk,
            dispatch
          )
        },
        ...options,
        ...entityCacheOptions,
        enabled:
          options?.enabled !== false && !!collectionId && collectionId > 0
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      uniqueCollectionIds,
      currentUserId,
      audiusSdk,
      queryClient,
      dispatch,
      options?.enabled,
      options?.staleTime,
      options?.placeholderData,
      options?.refetchOnMount,
      options?.throwOnError,
      options?.refetchInterval,
      options?.refetchOnWindowFocus
    ]
  )

  const queriesResults = useQueries({
    queries,
    combine: combineQueryResults<TQCollection[]>
  })

  const { data: collections } = queriesResults

  const byId = useMemo(() => keyBy(collections, 'playlist_id'), [collections])

  return {
    data: collections,
    byId,
    status: queriesResults.status,
    isPending: queriesResults.isPending,
    isLoading: queriesResults.isLoading,
    isFetching: queriesResults.isFetching,
    isSuccess: queriesResults.isSuccess,
    isError: queriesResults.isError
  }
}
