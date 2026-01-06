import { useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { Theme } from '@audius/common/models'
import { tokenDashboardPageActions } from '@audius/common/store'
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'

import { IconSolana } from '@audius/harmony-native'
import {
  connectNewWallet,
  setConnectionType,
  signMessage
} from 'app/store/wallet-connect/slice'
import { makeStyles } from 'app/styles'

import { WalletConnectOption } from './WalletConnectOption'
import useAuthorization from './useSolanaPhoneAuthorization'

const { updateWalletError } = tokenDashboardPageActions

const messages = {
  title: 'Solana Mobile'
}

const useStyles = makeStyles(({ type }) => ({
  root: {
    backgroundColor: type === Theme.LIGHT ? 'black' : 'white',
    height: 64,
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32
  }
}))

export const SolanaPhoneOption = () => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const { data: accountUserId } = useCurrentUserId()

  const { authorizeSession, selectedAccount } = useAuthorization()
  const handleConnectWallet = useCallback(async () => {
    dispatch(
      setConnectionType({ connectionType: 'solana-phone-wallet-adapter' })
    )

    const message = `AudiusUserID:${accountUserId}`
    const messageBuffer = new Uint8Array(
      message.split('').map((c) => c.charCodeAt(0))
    )

    let publicKey: string

    const {
      // @ts-ignore: wallet adapter types are wrong
      signed_payloads: [signature]
    } = await transact(async (wallet) => {
      const freshAccount = await authorizeSession(wallet)
      // Existing account or newly connected account
      publicKey = selectedAccount?.address ?? freshAccount.address

      dispatch(
        connectNewWallet({
          connectionType: 'solana-phone-wallet-adapter',
          publicKey
        })
      )

      try {
        return await wallet.signMessages({
          addresses: [publicKey],
          payloads: [Buffer.from(messageBuffer).toString('base64')]
        })
      } catch (e) {
        dispatch(
          updateWalletError({
            errorMessage:
              'An error occured while connecting a wallet with your account.'
          })
        )
        return { signed_payloads: [''] }
      }
    })

    dispatch(
      signMessage({
        path: 'wallet-sign-message',
        data: signature,
        connectionType: 'solana-phone-wallet-adapter'
      })
    )
  }, [dispatch, authorizeSession, selectedAccount, accountUserId])

  return (
    <WalletConnectOption
      name={messages.title}
      icon={
        <View style={styles.root}>
          <IconSolana height={36} width={36} />
        </View>
      }
      onPress={handleConnectWallet}
    />
  )
}
