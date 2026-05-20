import { useCallback } from 'react'

import { useCoinflowWithdrawalAdapter } from '@audius/common/hooks'
import { registerNiceModalId } from '@audius/common/services'
import {
  withdrawUSDCActions,
  withdrawUSDCSelectors
} from '@audius/common/store'
import { CoinflowWithdraw, OnSuccessMethod } from '@coinflowlabs/react'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { useDispatch, useSelector } from 'react-redux'

import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { env } from 'services/env'
import zIndex from 'utils/zIndex'

import styles from './CoinflowWithdrawModal.module.css'

const { getWithdrawAmount } = withdrawUSDCSelectors
const { coinflowWithdrawalCanceled, coinflowWithdrawalSucceeded } =
  withdrawUSDCActions

const parseTransactionFromSuccessParams = (params: string) => {
  try {
    const parsed = JSON.parse(params)
    return parsed.data as string
  } catch (e) {
    console.error(
      `Failed to parse transaction from params: ${params}, received error: ${e}`
    )
    return ''
  }
}

const MERCHANT_ID = env.COINFLOW_MERCHANT_ID
const IS_PRODUCTION = env.ENVIRONMENT === 'production'

export const CoinflowWithdrawModal = NiceModal.create(() => {
  const modal = useModal()
  const onClose = useCallback(() => modal.hide(), [modal])
  const onClosed = onClose
  const isOpen = modal.visible
  const amount = useSelector(getWithdrawAmount)

  const adapter = useCoinflowWithdrawalAdapter()
  const dispatch = useDispatch()

  const handleClose = useCallback(() => {
    dispatch(coinflowWithdrawalCanceled())
    onClose()
  }, [dispatch, onClose])

  const handleSuccess = useCallback<OnSuccessMethod>(
    (args) => {
      const transaction =
        typeof args === 'object'
          ? (args.hash ?? '')
          : parseTransactionFromSuccessParams(args)

      dispatch(coinflowWithdrawalSucceeded({ transaction }))
      onClose()
    },
    [dispatch, onClose]
  )

  const showContent = isOpen && adapter && amount !== undefined

  return (
    <ModalDrawer
      bodyClassName={styles.modalBody}
      wrapperClassName={styles.modalWrapper}
      zIndex={zIndex.COINFLOW_ONRAMP_MODAL}
      isFullscreen
      isOpen={isOpen}
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
          merchantId={MERCHANT_ID || ''}
          env={IS_PRODUCTION ? 'prod' : 'sandbox'}
          blockchain='solana'
        />
      ) : null}
    </ModalDrawer>
  )
})

NiceModal.register('CoinflowWithdraw', CoinflowWithdrawModal)
registerNiceModalId('CoinflowWithdraw')
