import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { DeveloperApp } from '~/schemas/developerApps'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { getDeveloperAppsQueryKey } from './useDeveloperApps'

export const useDeleteDeveloperApp = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async (apiKey: string) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      const sdk = await audiusSdk()

      await sdk.developerApps.deleteDeveloperApp({
        userId: Id.parse(currentUserId),
        appApiKey: apiKey
      })
      return {}
    },
    onSuccess: (_response, apiKey) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      queryClient.setQueryData(
        getDeveloperAppsQueryKey(currentUserId),
        (oldData: DeveloperApp[] | undefined) => {
          if (!oldData) return []
          return oldData.filter((app) => app.apiKey !== apiKey)
        }
      )
    }
  })
}
