import { Id } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { User, UserMetadata } from '~/models'

import { getManagedAccountsQueryKey } from './useManagedAccounts'

type ApproveManagedAccountPayload = {
  userId: number
  grantorUser: UserMetadata | User
}

export const useApproveManagedAccount = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ApproveManagedAccountPayload) => {
      const { grantorUser, userId } = payload
      const grantorUserId = grantorUser.user_id
      const encodedUserId = Id.parse(userId)
      const encodedGrantorUserId = Id.parse(grantorUserId)
      const sdk = await audiusSdk()
      await sdk.grants.approveGrant({
        userId: encodedUserId,
        grantorUserId: encodedGrantorUserId
      })
      return payload
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: getManagedAccountsQueryKey(data.userId)
      })
    }
  })
}
