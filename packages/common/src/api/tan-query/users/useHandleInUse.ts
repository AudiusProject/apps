import { useQuery } from '@tanstack/react-query'
import { isEmpty } from 'lodash'

import { useQueryContext } from '~/api/tan-query/utils'
import { QueryContextType } from '~/api/tan-query/utils/QueryContext'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'

export const fetchHandleInUse = async (
  handle: string | null | undefined,
  { audiusSdk }: QueryContextType
) => {
  if (!handle) return false
  const sdk = await audiusSdk()
  try {
    const { data: users = [] } = await sdk.full.users.getUserByHandle({
      handle
    })
    return !isEmpty(users[0])
  } catch (e: any) {
    if ('response' in e && e.response.status === 404) {
      // Expect not found when handle is available
      return false
    }
    throw e
  }
}

export const getHandleInUseQueryKey = (handle: string | null | undefined) => {
  return [QUERY_KEYS.handleInUse, handle] as unknown as QueryKey<boolean>
}

/**
 * Hook to check if a handle is already in use
 */
export const useHandleInUse = (
  handle: string | null | undefined,
  options?: QueryOptions
) => {
  const context = useQueryContext()

  return useQuery({
    queryKey: getHandleInUseQueryKey(handle),
    queryFn: () => fetchHandleInUse(handle, context),
    ...options,
    enabled: options?.enabled !== false && !!handle
  })
}
