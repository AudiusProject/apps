import { Id } from '@audius/sdk/services'
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

      const result = await sdk.developerApps.createDeveloperApp({
        metadata: {
          name,
          description,
          imageUrl
        },
        userId: encodedUserId
      })
      const { apiKey, apiSecret } = result
      const bearerToken =
        'bearerToken' in result && typeof result.bearerToken === 'string'
          ? result.bearerToken
          : undefined

      if (!apiKey || !apiSecret) {
        throw new Error('Failed to create developer app')
      }

      // createGrant expects appApiKey without 0x prefix (40 hex chars); API returns api_key with 0x
      const appApiKeyForGrant = apiKey.startsWith('0x')
        ? apiKey.slice(2).toLowerCase()
        : apiKey.toLowerCase()

      await sdk.grants.createGrant({
        userId: encodedUserId,
        appApiKey: appApiKeyForGrant
      })

      return { name, description, imageUrl, apiKey, apiSecret, bearerToken }
    },
    onSuccess: (newApp: DeveloperApp) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      const { apiSecret: apiSecretIgnored, bearerToken, ...restNewApp } = newApp

      // Normalize apiKey to match list format (no 0x prefix, like API returns for address.slice(2))
      const apiKeyNormalized = restNewApp.apiKey.startsWith('0x')
        ? restNewApp.apiKey.slice(2).toLowerCase()
        : restNewApp.apiKey.toLowerCase()
      const appForList: DeveloperApp = {
        ...restNewApp,
        apiKey: apiKeyNormalized,
        ...(bearerToken != null
          ? {
              api_access_keys: [
                { api_access_key: bearerToken, is_active: true }
              ]
            }
          : {})
      }

      queryClient.setQueryData(
        getDeveloperAppsQueryKey(currentUserId),
        (oldData: DeveloperApp[] | undefined) => {
          if (!oldData) return [appForList]
          return [...oldData, appForList]
        }
      )
    }
  })
}
