import { useCallback, useEffect, useState } from 'react'

import { useCoinflowAdapter, useCoinflowSessionKey } from '@audius/common/hooks'
import {
  coinflowModalUIActions,
  useCoinflowOnrampModal
} from '@audius/common/store'
import { CoinflowPurchase, Currency } from '@coinflowlabs/react-native'
import { VersionedTransaction } from '@solana/web3.js'
import { TouchableOpacity, View } from 'react-native'
import { useDispatch } from 'react-redux'

import { IconCloseAlt } from '@audius/harmony-native'
import { AppDrawer } from 'app/components/drawer'
import { getCoinflowDeviceId } from 'app/services/coinflow'
import { env } from 'app/services/env'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemeColors } from 'app/utils/theme'
import { zIndex } from 'app/utils/zIndex'

import { CoinflowSessionStatus } from './CoinflowSessionStatus'

const MODAL_NAME = 'CoinflowOnramp'

const { ENVIRONMENT } = env
const IS_PRODUCTION = ENVIRONMENT === 'production'

const useStyles = makeStyles(({ spacing, palette }) => ({
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight8,
    height: spacing(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing(4)
  },
  contentContainer: {
    paddingTop: spacing(6),
    flex: 1
  },
  exitContainer: {
    justifyContent: 'flex-start',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2)
  }
}))

const { transactionCanceled, transactionSucceeded } = coinflowModalUIActions

const CoinflowOnrampDrawerHeader = ({ onClose }: { onClose: () => void }) => {
  const styles = useStyles()
  const { neutralLight4 } = useThemeColors()
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity activeOpacity={0.7} onPress={onClose}>
        <IconCloseAlt
          width={spacing(6)}
          height={spacing(6)}
          fill={neutralLight4}
        />
      </TouchableOpacity>
    </View>
  )
}

export const CoinflowOnrampDrawer = () => {
  const {
    data: { amount, serializedTransaction, purchaseMetadata },
    isOpen,
    onClose
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

  const handleSuccess = useCallback(() => {
    dispatch(transactionSucceeded({}))
    onClose()
  }, [dispatch, onClose])

  const handleClose = useCallback(() => {
    dispatch(transactionCanceled({}))
    onClose()
  }, [dispatch, onClose])

  const adapter = useCoinflowAdapter({
    onSuccess: handleSuccess,
    onFailure: handleClose
  })
  const deviceId = getCoinflowDeviceId()
  const { sessionKey, isError, isFetching, retry } = useCoinflowSessionKey({
    wallet: adapter?.wallet.publicKey.toBase58(),
    environment: IS_PRODUCTION ? 'prod' : 'sandbox',
    enabled: isOpen
  })
  const showContent = isOpen && adapter && sessionKey

  return (
    <AppDrawer
      blockClose={false}
      drawerHeader={CoinflowOnrampDrawerHeader}
      zIndex={zIndex.COINFLOW_ONRAMP_DRAWER}
      modalName={MODAL_NAME}
      isGestureSupported={false}
      isFullscreen
      onClose={handleClose}
    >
      {showContent ? (
        <CoinflowPurchase
          // SDK runtime supports sessionKey with a wallet, but its types omit it.
          {...{ sessionKey }}
          deviceId={deviceId}
          transaction={transaction}
          wallet={adapter.wallet}
          chargebackProtectionData={purchaseMetadata ? [purchaseMetadata] : []}
          connection={adapter.connection}
          onSuccess={handleSuccess}
          merchantId={env.COINFLOW_MERCHANT_ID || ''}
          env={IS_PRODUCTION ? 'prod' : 'sandbox'}
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
    </AppDrawer>
  )
}
