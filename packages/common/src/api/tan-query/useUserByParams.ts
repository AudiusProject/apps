import { useEffect } from 'react'

import { useDispatch } from 'react-redux'

import { ID } from '~/models/Identifiers'
import { profilePageActions } from '~/store/pages'

import { QueryOptions } from './types'
import { useUser } from './useUser'
import { useUserByHandle } from './useUserByHandle'

const { fetchProfileSucceeded } = profilePageActions

type UserParams = { userId?: ID } | { handle?: string }

/**
 * Hook that returns user data given either a user ID or handle.
 * Uses useUser and useUserByHandle internally to maintain consistent caching behavior.
 * @param params The user params - either {id} or {handle}
 * @param options Optional configuration for the query
 * @returns The user data or null if not found
 */
export const useUserByParams = (params: UserParams, options?: QueryOptions) => {
  const userId = 'userId' in params ? params.userId : null
  const handle = 'handle' in params ? params.handle : null
  const dispatch = useDispatch()

  const idQuery = useUser(userId, options)
  const handleQuery = useUserByHandle(handle, options)

  const query = userId ? idQuery : handleQuery

  const { isSuccess, data } = query
  const userIdResult = data?.user_id
  const handleResult = data?.handle

  useEffect(() => {
    if (isSuccess && userIdResult && handleResult) {
      dispatch(fetchProfileSucceeded(handleResult, userIdResult, false))
    }
  }, [isSuccess, userIdResult, dispatch, handleResult])

  return query
}
