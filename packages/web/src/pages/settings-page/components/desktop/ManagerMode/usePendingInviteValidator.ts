import { useContext, useEffect, useState } from 'react'

import { ManagedUserMetadata } from '@audius/common/models'
import { attemptStringToNumber, route } from '@audius/common/utils'

import { ToastContext } from 'components/toast/ToastContext'
import { useQueryParamConsumer } from 'hooks/useQueryParamConsumer'

const { SETTINGS_PAGE } = route

const PENDING_ID_QUERY_PARAM = 'pending'

const messages = {
  invalidInvitation: 'This invitation is no longer valid',
  alreadyAcceptedInvitation: 'You already accepted this invitation'
}

export const usePendingInviteValidator = ({
  userId,
  managedAccounts
}: {
  userId?: number
  managedAccounts?: ManagedUserMetadata[]
}) => {
  const pendingIdString = useQueryParamConsumer({
    paramName: PENDING_ID_QUERY_PARAM,
    replacementRoute: SETTINGS_PAGE
  })
  const [lastValidatedIdParam, setLastValidatedIdParam] = useState<
    string | null
  >(null)

  const { toast } = useContext(ToastContext)

  useEffect(() => {
    if (
      userId == null ||
      managedAccounts == null ||
      pendingIdString === lastValidatedIdParam
    ) {
      return
    }
    setLastValidatedIdParam(pendingIdString)

    const pendingId = attemptStringToNumber(pendingIdString)
    if (pendingId == null) {
      return
    }

    const pendingManagedAccount = managedAccounts.find(
      (m) => m.grant.user_id === pendingId
    )
    if (!pendingManagedAccount) {
      toast(messages.invalidInvitation)
      return
    }
    if (pendingManagedAccount.grant.is_approved) {
      toast(messages.alreadyAcceptedInvitation)
    }
  }, [managedAccounts, userId, pendingIdString, lastValidatedIdParam, toast])
}
