import { useMemo } from 'react'

import { AudiusSdk } from '@audius/sdk'
import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { AnyAction, Dispatch } from 'redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { User } from '~/models/User'
import { getUserId } from '~/store/account/selectors'

import { getUsersBatcher } from '../batchers/getUsersBatcher'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'

export const getUserQueryKey = (userId: ID | null | undefined) => {
  return [QUERY_KEYS.user, userId] as unknown as QueryKey<User>
}

export const getUserQueryFn = async (
  userId: ID,
  currentUserId: ID | null | undefined,
  queryClient: QueryClient,
  sdk: AudiusSdk,
  dispatch: Dispatch<AnyAction>
) => {
  const batchGetUsers = getUsersBatcher({
    sdk,
    currentUserId,
    queryClient,
    dispatch
  })
  return await batchGetUsers.fetch(userId!)
}

export const useUser = <TResult = User>(
  userId: ID | null | undefined,
  options?: SelectableQueryOptions<User, TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const currentUserId = useSelector(getUserId)
  const validUserId = !!userId && userId > 0

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const select = useMemo(() => options?.select, [])

  return useQuery({
    queryKey: getUserQueryKey(userId),
    queryFn: async () =>
      getUserQueryFn(
        userId!,
        currentUserId,
        queryClient,
        await audiusSdk(),
        dispatch
      ),
    ...options,
    select,
    enabled: options?.enabled !== false && validUserId
  })
}
