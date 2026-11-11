import { useEffect, useRef } from 'react'

import { useAccountSwitcher } from '@audius/common/hooks'

import { useManagerModeAccounts } from './useManagerModeAccounts'

/**
 * Switches back to the signed-in user if their access to the managed account
 * they're using was revoked. Runs once per app launch.
 *
 * The managed accounts list is persisted and never goes stale on its own, so
 * it's refetched first. Otherwise a grant removed from another device would
 * still look valid here.
 */
export const useManagedAccountAccessCheck = () => {
  const { currentUserId, isManagedAccount, isAccountsLoaded, refetchAccounts } =
    useManagerModeAccounts()
  const { switchToWeb3User } = useAccountSwitcher()
  const hasChecked = useRef(false)

  useEffect(() => {
    if (hasChecked.current || !currentUserId || !isAccountsLoaded) return
    hasChecked.current = true
    if (!isManagedAccount) return

    refetchAccounts().then(({ data, isError }) => {
      // Keep the current account if the refetch failed; we can't tell.
      if (isError || !data) return
      const hasAccess = data.some(
        ({ user, grant }) => grant.is_approved && user.user_id === currentUserId
      )
      if (!hasAccess) switchToWeb3User()
    })
  }, [
    currentUserId,
    isAccountsLoaded,
    isManagedAccount,
    refetchAccounts,
    switchToWeb3User
  ])
}
