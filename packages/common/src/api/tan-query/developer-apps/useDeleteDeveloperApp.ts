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
        address: apiKey
      })
      return {}
    },
    onMutate: async (apiKey) => {
      if (!currentUserId) return
      const queryKey = getDeveloperAppsQueryKey(currentUserId)
      await queryClient.cancelQueries({ queryKey })
      const previousApps = queryClient.getQueryData<DeveloperApp[]>(queryKey)
      queryClient.setQueryData(
        queryKey,
        (oldData: DeveloperApp[] | undefined) => {
          if (!oldData) return []
          return oldData.filter((app) => app.apiKey !== apiKey)
        }
      )
      return { previousApps }
    },
    onError: (_error, _apiKey, context) => {
      if (!currentUserId || !context?.previousApps) return
      queryClient.setQueryData(
        getDeveloperAppsQueryKey(currentUserId),
        context.previousApps
      )
    }
  })
}
