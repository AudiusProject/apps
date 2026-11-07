import { useMemo } from 'react'

import {
  useCurrentUserId,
  useCurrentWeb3Account,
  useManagedAccounts
} from '@audius/common/api'
import { useFeatureFlag, useIsManagedAccount } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

/**
 * Accounts the signed-in user can switch between. The switcher stays
 * available while managing an account even if the flag is off, so nobody
 * gets stuck in manager mode.
 */
export const useManagerModeAccounts = () => {
  const { isEnabled: isManagerModeEnabled } = useFeatureFlag(
    FeatureFlags.MOBILE_MANAGER_MODE
  )
  const { data: web3User } = useCurrentWeb3Account()
  const { data: currentUserId } = useCurrentUserId()
  const isManagedAccount = useIsManagedAccount()

  const { data: managedAccounts = [], isSuccess } = useManagedAccounts(
    web3User?.user_id
  )

  const accounts = useMemo(
    () => managedAccounts.filter(({ grant }) => grant.is_approved),
    [managedAccounts]
  )

  const canSwitch =
    !!web3User &&
    !!currentUserId &&
    (isManagedAccount || (isManagerModeEnabled && accounts.length > 0))

  return {
    web3User,
    currentUserId,
    accounts,
    isManagedAccount,
    isManagerModeEnabled,
    isAccountsLoaded: isSuccess,
    canSwitch
  }
}
