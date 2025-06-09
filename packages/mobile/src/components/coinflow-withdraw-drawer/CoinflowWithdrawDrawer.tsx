import { useCallback } from 'react'

import { useCoinflowWithdrawalAdapter } from '@audius/common/hooks'
import {
  useCoinflowWithdrawModal,
  withdrawUSDCActions,
  withdrawUSDCSelectors,
  useWithdrawUSDCModal,
  WithdrawUSDCModalPages
} from '@audius/common/store'
import { CoinflowWithdraw } from '@coinflowlabs/react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, IconButton, IconCloseAlt } from '@audius/harmony-native'
import { AppDrawer } from 'app/components/drawer'
import { env } from 'app/services/env'
import { zIndex } from 'app/utils/zIndex'

const MODAL_NAME = 'CoinflowWithdraw'

const { ENVIRONMENT } = env
const IS_PRODUCTION = ENVIRONMENT === 'production'

const { getWithdrawAmount } = withdrawUSDCSelectors
const { coinflowWithdrawalCanceled, coinflowWithdrawalSucceeded } =
  withdrawUSDCActions

const CoinflowWithdrawDrawerHeader = ({ onClose }: { onClose: () => void }) => {
  return (
    <Flex row justifyContent='flex-start' alignItems='center' p='l'>
      <IconButton
        onPress={onClose}
        icon={IconCloseAlt}
        size='l'
        color='subdued'
      />
    </Flex>
  )
}

export const CoinflowWithdrawDrawer = () => {
  const { isOpen, onClose, onClosed } = useCoinflowWithdrawModal()
  const { setData } = useWithdrawUSDCModal()
  const amount = useSelector(getWithdrawAmount)
  const dispatch = useDispatch()

  const adapter = useCoinflowWithdrawalAdapter()

  const handleClose = useCallback(() => {
    dispatch(coinflowWithdrawalCanceled())
    setData({ page: WithdrawUSDCModalPages.PREPARE_TRANSFER })
    onClose()
  }, [dispatch, setData, onClose])

  const handleSuccess = useCallback(() => {
    dispatch(coinflowWithdrawalSucceeded({ transaction: '' }))
    onClose()
  }, [dispatch, onClose])

  const showContent = isOpen && adapter && amount !== undefined

  return (
    <AppDrawer
      blockClose={false}
      drawerHeader={CoinflowWithdrawDrawerHeader}
      zIndex={zIndex.COINFLOW_ONRAMP_DRAWER}
      modalName={MODAL_NAME}
      isGestureSupported={false}
      isFullscreen
      onClose={handleClose}
      onClosed={onClosed}
    >
      {showContent ? (
        <CoinflowWithdraw
          amount={amount / 100}
          lockAmount={true}
          wallet={adapter.wallet}
          connection={adapter.connection}
          onSuccess={handleSuccess}
          merchantId={env.COINFLOW_MERCHANT_ID || ''}
          env={IS_PRODUCTION ? 'prod' : 'sandbox'}
          blockchain='solana'
        />
      ) : null}
    </AppDrawer>
  )
}
