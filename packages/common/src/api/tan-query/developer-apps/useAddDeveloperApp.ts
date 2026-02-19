import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { DeveloperApp, NewAppPayload } from '~/schemas/developerApps'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { getDeveloperAppsQueryKey } from './useDeveloperApps'

export const useAddDeveloperApp = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async (newApp: NewAppPayload) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      const { name, description, imageUrl } = newApp
      const encodedUserId = Id.parse(currentUserId)
      const sdk = await audiusSdk()

      const { apiKey, apiSecret } = await sdk.developerApps.createDeveloperApp({
        name,
        description,
        imageUrl,
        userId: encodedUserId
      })

      await sdk.grants.createGrant({
        userId: encodedUserId,
        appApiKey: apiKey
      })

      return { name, description, imageUrl, apiKey, apiSecret }
    },
    onSuccess: (newApp: DeveloperApp) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      const { apiSecret: apiSecretIgnored, ...restNewApp } = newApp

      queryClient.setQueryData(
        getDeveloperAppsQueryKey(currentUserId),
        (oldData: DeveloperApp[] | undefined) => {
          if (!oldData) return [restNewApp]
          return [...oldData, restNewApp]
        }
      )
    }
  })
}
