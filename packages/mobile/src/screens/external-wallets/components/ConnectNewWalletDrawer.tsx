import { View } from 'react-native'

import { Text } from 'app/components/core'
import { NativeDrawer } from 'app/components/drawer'
import LoadingSpinner from 'app/components/loading-spinner'
import { makeStyles } from 'app/styles'
import { isSolanaPhone } from 'app/utils/os'

import { useCanConnectNewWallet } from '../useCanConnectNewWallet'

import { PhantomWalletConnectOption } from './PhantomWalletConnectOption'
import { SolanaPhoneOption } from './SolanaPhoneOption'

const MODAL_NAME = 'ConnectNewWallet'

const messages = {
  title: 'Select Wallet',
  connecting: 'Connecting...'
}

const useStyles = makeStyles(({ spacing, palette }) => ({
  root: {
    marginTop: spacing(4),
    marginHorizontal: spacing(4),
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative'
  },
  title: {
    marginTop: spacing(4),
    marginBottom: spacing(2),
    color: palette.neutralLight2
  },
  walletConnectionList: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  connectingOverlay: {
    position: 'absolute',
    opacity: 0.3,
    zIndex: 2,
    backgroundColor: palette.white,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center'
  }
}))

export const ConnectNewWalletDrawer = () => {
  const styles = useStyles()
  const canConnectNewWallet = useCanConnectNewWallet()

  return (
    <NativeDrawer
      drawerName={MODAL_NAME}
      isGestureSupported={canConnectNewWallet}
    >
      <View style={styles.root}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={styles.title}
            fontSize='xl'
            weight='heavy'
            textTransform='uppercase'
          >
            {canConnectNewWallet ? messages.title : messages.connecting}
          </Text>
          {!canConnectNewWallet ? (
            <LoadingSpinner
              style={{ height: 25, width: 25, marginLeft: 4, marginTop: 2 }}
            />
          ) : null}
        </View>
        <View style={styles.walletConnectionList}>
          {isSolanaPhone ? (
            <SolanaPhoneOption />
          ) : (
            <PhantomWalletConnectOption />
          )}
        </View>
      </View>
      {!canConnectNewWallet ? (
        <View style={styles.connectingOverlay}></View>
      ) : null}
    </NativeDrawer>
  )
}
