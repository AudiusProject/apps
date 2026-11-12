import { all, call } from 'typed-redux-saga'

import { ID } from '~/models/Identifiers'
import { User } from '~/models/User'
import { getContext } from '~/store/effects'
import { getSDK } from '~/store/sdkUtils'

import { getUserQueryFn, getUserQueryKey } from '../users/useUser'
import {
  getUserByHandleQueryFn,
  getUserByHandleQueryKey
} from '../users/useUserByHandle'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { isValidId } from '../utils/isValidId'

import { queryCurrentUserId } from './queryAccount'

type QueryOptions = {
  force?: boolean
  staleTime?: number
}

export function* queryUser(
  id: ID | null | undefined,
  queryOptions?: QueryOptions
) {
  if (!isValidId(id)) return undefined
  const queryClient = yield* getContext('queryClient')
  const dispatch = yield* getContext('dispatch')
  const sdk = yield* getSDK()
  const currentUserId = yield* call(queryCurrentUserId)

  const queryData = yield* call([queryClient, queryClient.fetchQuery], {
    queryKey: getUserQueryKey(id),
    queryFn: async () =>
      getUserQueryFn(id!, currentUserId, queryClient, sdk, dispatch),
    ...entityCacheOptions,
    ...queryOptions
  })

  return queryData as User | undefined
}

export function* queryUserByHandle(
  handle: string | null | undefined,
  queryOptions?: QueryOptions
) {
  if (!handle) return undefined
  const queryClient = yield* getContext('queryClient')
  const currentUserId = yield* call(queryCurrentUserId)
  const sdk = yield* getSDK()
  const userId = (yield* call([queryClient, queryClient.fetchQuery], {
    queryKey: getUserByHandleQueryKey(handle),
    queryFn: async () =>
      getUserByHandleQueryFn(handle, sdk, queryClient, currentUserId),
    ...entityCacheOptions,
    ...queryOptions
  })) as ID | undefined
  if (!userId) return undefined
  const userMetadata = yield* call(queryUser, userId, queryOptions)
  return userMetadata
}

export function* queryUsers(ids: ID[], queryOptions?: QueryOptions) {
  const users = {} as Record<ID, User>

  // NOTE: its important to run these in parallel so that the batcher picks all the users at once
  const userResults = yield* all(
    ids.map((id) => {
      return call(queryUser, id, queryOptions)
    })
  )

  userResults.forEach((user, index) => {
    if (user) {
      users[ids[index]] = user
    }
  })

  return users
}
