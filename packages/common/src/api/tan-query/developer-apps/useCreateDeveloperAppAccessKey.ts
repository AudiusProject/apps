import { Id } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { getDeveloperAppsQueryKey } from './useDeveloperApps'

export const useCreateDeveloperAppAccessKey = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async (apiKey: string) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      const sdk = await audiusSdk()
      const address = apiKey.startsWith('0x') ? apiKey : `0x${apiKey}`
      const result = await sdk.developerApps.createDeveloperAppAccessKey({
        userId: Id.parse(currentUserId),
        address
      })
      const apiAccessKey =
        'api_access_key' in result
          ? (result as { api_access_key: string }).api_access_key
          : (result as { apiAccessKey: string }).apiAccessKey
      return { apiKey, api_access_key: apiAccessKey ?? '' }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getDeveloperAppsQueryKey(currentUserId)
      })
    }
  })
}
