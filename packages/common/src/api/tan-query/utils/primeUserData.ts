import { QueryClient } from '@tanstack/react-query'

import { User } from '~/models/User'
import { getContext } from '~/store/effects'

import { getUserQueryKey } from '../users/useUser'
import { getUserByHandleQueryKey } from '../users/useUserByHandle'

export const primeUserData = ({
  users,
  queryClient,
  forceReplace = false,
  skipQueryData = false
}: {
  users: User[]
  queryClient: QueryClient
  forceReplace?: boolean
  skipQueryData?: boolean
}) => {
  users.forEach((user) => {
    if (
      forceReplace ||
      (!skipQueryData &&
        !queryClient.getQueryData(getUserQueryKey(user.user_id)))
    ) {
      queryClient.setQueryData(getUserQueryKey(user.user_id), user)
    }

    if (
      forceReplace ||
      !queryClient.getQueryData(getUserByHandleQueryKey(user.handle))
    ) {
      queryClient.setQueryData(
        getUserByHandleQueryKey(user.handle),
        user.user_id
      )
    }
  })
}

export function* primeUserDataSaga(users: User[]) {
  const queryClient = yield* getContext('queryClient')
  return primeUserData({ users, queryClient })
}
