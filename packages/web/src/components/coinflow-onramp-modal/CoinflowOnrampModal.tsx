import { useCallback, useEffect, useState } from 'react'

import { useCoinflowAdapter, useCoinflowSessionKey } from '@audius/common/hooks'
import {
  coinflowModalUIActions,
  useCoinflowOnrampModal
} from '@audius/common/store'
import { CoinflowPurchase, Currency } from '@coinflowlabs/react'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { VersionedTransaction } from '@solana/web3.js'
import { useDispatch } from 'react-redux'

import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { env } from 'services/env'
import { isElectron } from 'utils/clientUtil'
import zIndex from 'utils/zIndex'

import styles from './CoinflowOnrampModal.module.css'
import { CoinflowSessionStatus } from './CoinflowSessionStatus'

const { transactionSucceeded, transactionCanceled } = coinflowModalUIActions

const MERCHANT_ID = env.COINFLOW_MERCHANT_ID
const IS_PRODUCTION = env.ENVIRONMENT === 'production'

export const CoinflowOnrampModal = NiceModal.create(() => {
  const modal = useModal()
  const onClose = useCallback(() => modal.hide(), [modal])
  const onClosed = onClose
  const isOpen = modal.visible
  const {
    data: { amount, serializedTransaction, purchaseMetadata, guestEmail }
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
  const { sessionKey, isError, isFetching, retry } = useCoinflowSessionKey({
    wallet: adapter?.wallet.publicKey.toBase58(),
    environment: IS_PRODUCTION ? 'prod' : 'sandbox',
    enabled: isOpen
  })
  const showContent = isOpen && adapter && sessionKey

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
          // SDK runtime supports sessionKey with a wallet, but its types omit it.
          {...{ sessionKey }}
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
      ) : isOpen ? (
        <CoinflowSessionStatus
          isError={isError}
          isFetching={isFetching}
          onRetry={() => retry()}
        />
      ) : null}
    </ModalDrawer>
  )
})
