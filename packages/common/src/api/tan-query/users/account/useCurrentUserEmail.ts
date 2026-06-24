import { useQuery } from '@tanstack/react-query'

import { UserEmailResponse } from '~/services/auth/identity'

import { QUERY_KEYS } from '../../queryKeys'
import { QueryKey, QueryOptions } from '../../types'
import { useQueryContext } from '../../utils'

import { useCurrentUserId } from './useCurrentUserId'

export const getCurrentUserEmailQueryKey = () =>
  [QUERY_KEYS.currentUserEmail] as unknown as QueryKey<UserEmailResponse>

/**
 * Hook to get the currently logged in user's email address and email
 * verification status from identity service.
 */
export const useCurrentUserEmail = (options?: QueryOptions) => {
  const { identityService } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getCurrentUserEmailQueryKey(),
    queryFn: () => identityService.getUserEmailAndStatus(),
    ...options,
    enabled: options?.enabled !== false && !!currentUserId
  })
}
