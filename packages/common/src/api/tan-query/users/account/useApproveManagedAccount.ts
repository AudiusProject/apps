import { Id, type AudiusSdkWithServices } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { User, UserMetadata } from '~/models'

import { getManagedAccountsQueryKey } from './useManagedAccounts'
import { getManagersQueryKey } from './useManagers'

const MANAGER_GRANT_CONFIRMATION_TIMEOUT_MS = 45_000
const MANAGER_GRANT_CONFIRMATION_POLLING_INTERVAL_MS = 2_000

type ApproveManagedAccountPayload = {
  userId: number
  grantorUser: UserMetadata | User
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForManagerGrantApproval = async ({
  sdk,
  encodedUserId,
  encodedGrantorUserId
}: {
  sdk: AudiusSdkWithServices
  encodedUserId: string
  encodedGrantorUserId: string
}) => {
  const start = Date.now()

  while (Date.now() - start < MANAGER_GRANT_CONFIRMATION_TIMEOUT_MS) {
    const { data = [] } = await sdk.users.getManagedUsers({
      id: encodedUserId
    })
    const approvedGrant = data.find(
      ({ user, grant }) =>
        user.id === encodedGrantorUserId && grant.isApproved === true
    )

    if (approvedGrant) {
      return
    }

    await sleep(MANAGER_GRANT_CONFIRMATION_POLLING_INTERVAL_MS)
  }

  throw new Error('Could not confirm manager grant approval')
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
      await sdk.grants.approveGrantWithEntityManager(
        {
          userId: encodedUserId,
          grantorUserId: encodedGrantorUserId
        },
        { skipConfirmation: true }
      )
      await waitForManagerGrantApproval({
        sdk,
        encodedUserId,
        encodedGrantorUserId
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
