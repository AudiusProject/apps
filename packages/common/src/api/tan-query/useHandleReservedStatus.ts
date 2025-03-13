import { useQuery } from '@tanstack/react-query'

import { useAudiusQueryContext } from '~/audius-query'
import { AudiusQueryContextType } from '~/audius-query/AudiusQueryContext'
import { FeatureFlags } from '~/services/remote-config/feature-flags'
import { IntKeys } from '~/services/remote-config/types'
import { parseHandleReservedStatusFromSocial } from '~/utils/handleReservedStatus'
import { promiseWithTimeout } from '~/utils/promiseWithTimeout'

import { QUERY_KEYS } from './queryKeys'
import { QueryOptions } from './types'

const DEFAULT_HANDLE_VERIFICATION_TIMEOUT_MILLIS = 5_000

export const fetchHandleReservedStatus = async (
  handle: string | null | undefined,
  {
    audiusBackend,
    identityService,
    remoteConfigInstance,
    env
  }: AudiusQueryContextType
) => {
  if (!handle) return 'notReserved'

  const handleCheckTimeout =
    remoteConfigInstance.getRemoteVar(
      IntKeys.HANDLE_VERIFICATION_TIMEOUT_MILLIS
    ) ?? DEFAULT_HANDLE_VERIFICATION_TIMEOUT_MILLIS

  if (env.ENVIRONMENT === 'production') {
    const twitterCheckPromise = remoteConfigInstance.getFeatureEnabled(
      FeatureFlags.VERIFY_HANDLE_WITH_TWITTER
    )
      ? promiseWithTimeout(
          identityService.lookupTwitterHandle(handle),
          handleCheckTimeout
        )
      : null

    const instagramCheckPromise = remoteConfigInstance.getFeatureEnabled(
      FeatureFlags.VERIFY_HANDLE_WITH_INSTAGRAM
    )
      ? promiseWithTimeout(
          audiusBackend.instagramHandle(handle),
          handleCheckTimeout
        )
      : null

    const tiktokCheckPromise = remoteConfigInstance.getFeatureEnabled(
      FeatureFlags.VERIFY_HANDLE_WITH_TIKTOK
    )
      ? promiseWithTimeout(
          audiusBackend.tiktokHandle(handle),
          handleCheckTimeout
        )
      : null

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
) => [QUERY_KEYS.handleReservedStatus, handle]

/**
 * Hook to check if a handle is reserved on social media platforms
 */
export const useHandleReservedStatus = <TResult = string>(
  handle: string | null | undefined,
  options?: QueryOptions<string, TResult>
) => {
  const context = useAudiusQueryContext()

  return useQuery({
    queryKey: getHandleReservedStatusQueryKey(handle),
    queryFn: () => fetchHandleReservedStatus(handle, context),
    ...options,
    enabled: options?.enabled !== false && !!handle
  })
}
