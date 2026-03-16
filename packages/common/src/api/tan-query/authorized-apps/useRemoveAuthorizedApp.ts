import { AuthorizedApp, Id } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'

import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export type UseRemoveAuthorizedAppArgs = {
  address: string
  userId: ID
}

export const getRemoveAuthorizedAppQueryKey = (userId: ID) => {
  return [QUERY_KEYS.authorizedApps, userId] as unknown as QueryKey<
    AuthorizedApp[]
  >
}

export const useRemoveAuthorizedApp = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async (address: string) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      const sdk = await audiusSdk()

      await sdk.grants.revokeGrant({
        userId: Id.parse(currentUserId),
        appApiKey: address.slice(2)
      })
    },
    onMutate: (address) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      queryClient.invalidateQueries({
        queryKey: getRemoveAuthorizedAppQueryKey(currentUserId)
      })

      const previousApps: AuthorizedApp[] | undefined =
        queryClient.getQueryData(getRemoveAuthorizedAppQueryKey(currentUserId))

      if (previousApps === undefined) {
        return {
          previousApps: []
        }
      }

      // Splice out the removed app
      const appIndex = previousApps?.findIndex((app) => app.address === address)
      const newApps = cloneDeep(previousApps).splice(appIndex, 1)

      queryClient.setQueryData(
        getRemoveAuthorizedAppQueryKey(currentUserId),
        newApps
      )

      // Return context with the previous apps
      return { previousApps }
    },
    onError: (_error, _address, context) => {
      if (!currentUserId) {
        throw new Error('No current user ID')
      }
      queryClient.setQueryData(
        getRemoveAuthorizedAppQueryKey(currentUserId),
        context?.previousApps
      )
    }
  })
}
