import { useMemo } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { keyBy } from 'lodash'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { UserMetadata } from '~/models/User'

import { QueryOptions } from '../types'
import { combineQueryResults } from '../utils/combineQueryResults'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { useQueries } from '../utils/useQueries'

import { useCurrentUserId } from './account/useCurrentUserId'
import { getUserQueryFn, getUserQueryKey } from './useUser'

export const useUsers = (
  userIds: ID[] | null | undefined,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  // Filter out duplicate IDs. Callers often pass a new array each render, so
  // key on the ids themselves to keep the queries below stable.
  const userIdsKey = userIds?.join(',')
  const uniqueUserIds = useMemo(
    () =>
      userIds?.filter((id, index, self) => self.indexOf(id) === index && !!id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userIdsKey]
  )

  // Rebuilding these every render makes tanstack re-hash every key and
  // re-sync every observer, so only rebuild when an input changes.
  const queries = useMemo(
    () =>
      uniqueUserIds?.map((userId) => ({
        queryKey: getUserQueryKey(userId),
        queryFn: async () =>
          getUserQueryFn(
            userId,
            currentUserId,
            queryClient,
            await audiusSdk(),
            dispatch
          ),
        ...options,
        ...entityCacheOptions,
        enabled: options?.enabled !== false && !!userId && userId > 0
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      uniqueUserIds,
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

  const queryResults = useQueries({
    queries,
    combine: combineQueryResults<UserMetadata[]>
  })
  const { data: users } = queryResults

  const byId = useMemo(() => keyBy(users, 'user_id'), [users])

  return {
    data: users,
    byId,
    status: queryResults.status,
    isPending: queryResults.isPending,
    isLoading: queryResults.isLoading,
    isFetching: queryResults.isFetching,
    isSuccess: queryResults.isSuccess,
    isError: queryResults.isError
  }
}
