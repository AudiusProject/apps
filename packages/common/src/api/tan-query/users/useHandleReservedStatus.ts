import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { QueryContextType } from '~/api/tan-query/utils/QueryContext'
import { IntKeys } from '~/services/remote-config/types'
import { parseHandleReservedStatusFromSocial } from '~/utils/handleReservedStatus'
import { promiseWithTimeout } from '~/utils/promiseWithTimeout'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'

const DEFAULT_HANDLE_VERIFICATION_TIMEOUT_MILLIS = 5_000

export const fetchHandleReservedStatus = async (
  handle: string | null | undefined,
  {
    audiusBackend,
    identityService,
    remoteConfigInstance,
    env
  }: QueryContextType
) => {
  if (!handle) return 'notReserved'

  const handleCheckTimeout =
    remoteConfigInstance.getRemoteVar(
      IntKeys.HANDLE_VERIFICATION_TIMEOUT_MILLIS
    ) ?? DEFAULT_HANDLE_VERIFICATION_TIMEOUT_MILLIS

  if (env.ENVIRONMENT === 'production') {
    const twitterCheckPromise = promiseWithTimeout(
      identityService.lookupTwitterHandle(handle),
      handleCheckTimeout
    )
    const instagramCheckPromise = promiseWithTimeout(
      audiusBackend.instagramHandle(handle),
      handleCheckTimeout
    )
    const tiktokCheckPromise = promiseWithTimeout(
      audiusBackend.tiktokHandle(handle),
      handleCheckTimeout
    )

    const [twitterUser, instagramUser, tiktokUser] = await Promise.all([
      twitterCheckPromise,
      instagramCheckPromise,
      tiktokCheckPromise
    ])

    return parseHandleReservedStatusFromSocial({
      isOauthVerified: false,
      lookedUpTwitterUser: twitterUser,
      lookedUpInstagramUser: instagramUser,
      lookedUpTikTokUser: tiktokUser
    })
  } else {
    return 'notReserved'
  }
}

export const getHandleReservedStatusQueryKey = (
  handle: string | null | undefined
) =>
  [QUERY_KEYS.handleReservedStatus, handle] as unknown as QueryKey<
    'notReserved' | 'reserved'
  >

/**
 * Hook to check if a handle is reserved on social media platforms
 */
export const useHandleReservedStatus = (
  handle: string | null | undefined,
  options?: QueryOptions
) => {
  const context = useQueryContext()

  return useQuery({
    queryKey: getHandleReservedStatusQueryKey(handle),
    queryFn: () => fetchHandleReservedStatus(handle, context),
    ...options,
    enabled: options?.enabled !== false && !!handle
  })
}
