import { useHasAccount } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { IconWallet } from '@audius/harmony'

import { LeftNavLink } from '../LeftNavLink'

const { WALLET_PAGE } = route

const messages = {
  wallet: 'Wallet'
}

export const WalletNavItem = () => {
  const hasAccount = useHasAccount()

  return (
    <LeftNavLink
      leftIcon={IconWallet}
      to={WALLET_PAGE}
      restriction={'account'}
      disabled={!hasAccount}
    >
      {messages.wallet}
    </LeftNavLink>
  )
}
