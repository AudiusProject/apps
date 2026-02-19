import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { DeveloperApp, EditAppPayload } from '~/schemas/developerApps'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { getDeveloperAppsQueryKey } from './useDeveloperApps'

export const useEditDeveloperApp = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async (editApp: EditAppPayload) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      const { name, description, imageUrl, apiKey } = editApp
      const sdk = await audiusSdk()

      await sdk.developerApps.updateDeveloperApp({
        appApiKey: apiKey,
        name,
        description,
        imageUrl,
        userId: Id.parse(currentUserId)
      })

      return { name, description, imageUrl, apiKey }
    },
    onSuccess: (editApp: DeveloperApp) => {
      queryClient.setQueryData(
        getDeveloperAppsQueryKey(currentUserId),
        (oldData: DeveloperApp[] | undefined) => {
          if (!oldData) return [editApp]
          return oldData.map((app) =>
            app.apiKey === editApp.apiKey ? editApp : app
          )
        }
      )
    }
  })
}
