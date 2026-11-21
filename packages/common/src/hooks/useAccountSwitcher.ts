import { useCallback } from 'react'

import { useCurrentUserId, useCurrentWeb3Account } from '~/api'
import { useAppContext } from '~/context'
import { UserMetadata } from '~/models/User'

export const useAccountSwitcher = () => {
  const { localStorage, reloadApp } = useAppContext()
  const { data: currentWeb3User } = useCurrentWeb3Account()

  const switchAccount = useCallback(
    async (user: UserMetadata) => {
      if (!user.wallet) {
        console.error('User has no wallet address')
        return
      }
      if (currentWeb3User && currentWeb3User.wallet === user.wallet) {
        await localStorage.clearAudiusUserWalletOverride()
      } else {
        await localStorage.setAudiusUserWalletOverride(user.wallet)
      }

      await localStorage.clearAudiusAccount()
      await localStorage.clearAudiusAccountUser()

      if (reloadApp) {
        reloadApp()
      } else {
        window.location.reload()
      }
    },
    [currentWeb3User, localStorage, reloadApp]
  )

  const switchToWeb3User = useCallback(async () => {
    if (!currentWeb3User) {
      console.error('No current web3 user')
      return
    }
    switchAccount(currentWeb3User)
  }, [switchAccount, currentWeb3User])

  return { switchAccount, switchToWeb3User }
}

export const useIsManagedAccount = () => {
  const { data: currentWeb3User } = useCurrentWeb3Account()
  const { data: currentUserId } = useCurrentUserId()
  return (
    !!currentWeb3User &&
    !!currentUserId &&
    currentWeb3User.user_id !== currentUserId
  )
}
