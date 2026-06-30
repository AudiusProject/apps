import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { User, UserMetadata } from '~/models'

import { getManagedAccountsQueryKey } from './useManagedAccounts'
import { getManagersQueryKey } from './useManagers'

type RejectManagedAccountPayload = {
  userId: number
  grantorUser: UserMetadata | User
}

export const useRejectManagedAccount = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RejectManagedAccountPayload) => {
      const { grantorUser, userId } = payload
      const grantorUserId = grantorUser.user_id
      const encodedUserId = Id.parse(userId)
      const encodedGrantorUserId = Id.parse(grantorUserId)
      const sdk = await audiusSdk()
      await sdk.grants.rejectGrant({
        userId: encodedUserId,
        grantorUserId: encodedGrantorUserId
      })
      return payload
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: getManagedAccountsQueryKey(data.userId)
      })
      queryClient.invalidateQueries({
        queryKey: getManagersQueryKey(data.grantorUser.user_id)
      })
    }
  })
}
