import { useCallback, useEffect, useState } from 'react'

import { useCoinflowAdapter } from '@audius/common/hooks'
import {
  coinflowModalUIActions,
  useCoinflowOnrampModal
} from '@audius/common/store'
import { CoinflowPurchase, Currency } from '@coinflowlabs/react'
import { VersionedTransaction } from '@solana/web3.js'
import { useDispatch } from 'react-redux'

import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { env } from 'services/env'
import { isElectron } from 'utils/clientUtil'
import zIndex from 'utils/zIndex'

import styles from './CoinflowOnrampModal.module.css'

const { transactionSucceeded, transactionCanceled } = coinflowModalUIActions

const MERCHANT_ID = env.COINFLOW_MERCHANT_ID
const IS_PRODUCTION = env.ENVIRONMENT === 'production'

export const CoinflowOnrampModal = () => {
  const {
    data: { amount, serializedTransaction, purchaseMetadata, guestEmail },
    isOpen,
    onClose,
    onClosed
  } = useCoinflowOnrampModal()
  const dispatch = useDispatch()
  const [transaction, setTransaction] = useState<
    VersionedTransaction | undefined
  >(undefined)

  useEffect(() => {
    if (serializedTransaction) {
      try {
        const tx = VersionedTransaction.deserialize(
          Buffer.from(serializedTransaction, 'base64')
        )
        setTransaction(tx)
      } catch (e) {
        console.error(e)
      }
    }
  }, [serializedTransaction])

  const handleClose = useCallback(() => {
    dispatch(transactionCanceled({}))
    onClose()
  }, [dispatch, onClose])

  const handleSuccess = useCallback(() => {
    dispatch(transactionSucceeded({}))
    onClose()
  }, [dispatch, onClose])

  const adapter = useCoinflowAdapter({
    onSuccess: handleSuccess,
    onFailure: handleClose
  })
  const showContent = isOpen && adapter

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
        <CoinflowPurchase
          email={guestEmail}
          transaction={transaction}
          wallet={adapter.wallet}
          chargebackProtectionData={purchaseMetadata ? [purchaseMetadata] : []}
          connection={adapter.connection}
          onSuccess={handleSuccess}
          merchantId={MERCHANT_ID || ''}
          env={IS_PRODUCTION ? 'prod' : 'sandbox'}
          // @ts-ignore types are wrong in the package
          disableGooglePay={isElectron()}
          // @ts-ignore types are wrong in the package
          disableApplePay={isElectron()}
          blockchain='solana'
          subtotal={{ cents: amount * 100, currency: Currency.USD }}
        />
      ) : null}
    </ModalDrawer>
  )
}
