import { useEffect, useRef } from 'react'

import { useAccountSwitcher } from '@audius/common/hooks'

import { useManagerModeAccounts } from './useManagerModeAccounts'

/**
 * Switches back to the signed-in user if their access to the managed account
 * they're using was revoked. Runs once per app launch.
 */
export const useManagedAccountAccessCheck = () => {
  const { currentUserId, isManagedAccount, isAccountsLoaded, accounts } =
    useManagerModeAccounts()
  const { switchToWeb3User } = useAccountSwitcher()
  const hasChecked = useRef(false)

  useEffect(() => {
    if (hasChecked.current || !currentUserId || !isAccountsLoaded) return
    hasChecked.current = true
    if (
      isManagedAccount &&
      !accounts.some(({ user }) => user.user_id === currentUserId)
    ) {
      switchToWeb3User()
    }
  }, [
    accounts,
    currentUserId,
    isAccountsLoaded,
    isManagedAccount,
    switchToWeb3User
  ])
}
