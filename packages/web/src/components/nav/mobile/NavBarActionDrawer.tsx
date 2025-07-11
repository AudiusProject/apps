import { useCallback, useMemo } from 'react'

import { WALLET_PAGE } from '@audius/common/src/utils/route'
import { route } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import ActionDrawer from 'components/action-drawer/ActionDrawer'
import { push } from 'utils/navigation'

const { SETTINGS_PAGE, REWARDS_PAGE } = route

type NavBarActionDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

const messages = {
  wallet: 'Wallet',
  rewards: 'Rewards',
  settings: 'Settings'
}

export const NavBarActionDrawer = ({
  isOpen,
  onClose
}: NavBarActionDrawerProps) => {
  const dispatch = useDispatch()

  const goToRoute = useCallback(
    (route: string) => {
      dispatch(push(route))
    },
    [dispatch]
  )

  const goToWalletPage = useCallback(() => {
    setImmediate(() => goToRoute(WALLET_PAGE))
    onClose()
  }, [goToRoute, onClose])

  const goToSettingsPage = useCallback(() => {
    setImmediate(() => goToRoute(SETTINGS_PAGE))
    onClose()
  }, [goToRoute, onClose])

  const goToRewardsPage = useCallback(() => {
    setImmediate(() => goToRoute(REWARDS_PAGE))
    onClose()
  }, [goToRoute, onClose])

  const actions = useMemo(
    () => [
      {
        text: messages.wallet,
        onClick: goToWalletPage
      },
      {
        text: messages.rewards,
        onClick: goToRewardsPage
      },
      {
        text: messages.settings,
        onClick: goToSettingsPage
      }
    ],
    [goToRewardsPage, goToSettingsPage, goToWalletPage]
  )

  return <ActionDrawer actions={actions} onClose={onClose} isOpen={isOpen} />
}
