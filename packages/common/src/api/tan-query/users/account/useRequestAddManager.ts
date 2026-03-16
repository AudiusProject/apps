import { Id } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { User, UserMetadata } from '~/models'

import { getManagersQueryKey } from './useManagers'

type RequestAddManagerPayload = {
  userId: number
  managerUser: UserMetadata | User
}

export const useRequestAddManager = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RequestAddManagerPayload) => {
      const { managerUser, userId } = payload
      const managerUserId = managerUser.user_id
      const encodedUserId = Id.parse(userId)
      const encodedManagerUserId = Id.parse(managerUserId)
      const sdk = await audiusSdk()
      await sdk.grants.addManager({
        userId: encodedUserId,
        managerUserId: encodedManagerUserId
      })
      return payload
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: getManagersQueryKey(data.userId)
      })
    }
  })
}
