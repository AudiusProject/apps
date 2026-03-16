import { Id } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { getDeveloperAppsQueryKey } from './useDeveloperApps'

export const useDeactivateDeveloperAppAccessKey = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async ({
      apiKey,
      apiAccessKey
    }: {
      apiKey: string
      apiAccessKey: string
    }) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      const sdk = await audiusSdk()
      const address = apiKey.startsWith('0x') ? apiKey : `0x${apiKey}`
      await sdk.developerApps.deactivateDeveloperAppAccessKey({
        userId: Id.parse(currentUserId),
        address,
        metadata: { apiAccessKey }
      })
      return { apiKey, apiAccessKey }
    },
    onSuccess: (_, _variables) => {
      queryClient.invalidateQueries({
        queryKey: getDeveloperAppsQueryKey(currentUserId)
      })
    }
  })
}
