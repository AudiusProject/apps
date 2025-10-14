import { queryCurrentUserId } from '@audius/common/api'
import { Name, Chain } from '@audius/common/models'
import { tokenDashboardPageActions, getContext } from '@audius/common/store'
import { getErrorMessage } from '@audius/common/utils'
import type { Nullable } from '@audius/common/utils'
import bs58 from 'bs58'
import { checkIsNewWallet } from 'common/store/pages/token-dashboard/checkIsNewWallet'
import { getWalletInfo } from 'common/store/pages/token-dashboard/getWalletInfo'
import { Linking } from 'react-native'
import nacl from 'tweetnacl'
import { takeEvery, select, put, call } from 'typed-redux-saga'
import { getAddress } from 'viem'

import type { JsonMap } from 'app/types/analytics'

import { getDappKeyPair } from '../selectors'
import {
  connect,
  connectNewWallet,
  setConnectionStatus,
  setPublicKey,
  setSession,
  setSharedSecret
} from '../slice'
import type { ConnectAction, ConnectNewWalletAction } from '../types'
import { buildUrl, decryptPayload, encryptPayload } from '../utils'
const { setIsConnectingWallet, connectNewWallet: baseConnectNewWallet } =
  tokenDashboardPageActions

// Connection a new wallet to an Audius account
function* connectNewWalletAsync(action: ConnectNewWalletAction) {
  const accountUserId = yield* call(queryCurrentUserId)
  if (!accountUserId) return

  yield* put(baseConnectNewWallet())

  let eventProperties: Nullable<JsonMap> = null

  const analytics = yield* getContext('analytics')
  analytics.track({ eventName: Name.CONNECT_WALLET_NEW_WALLET_START })

  switch (action.payload.connectionType) {
    case null:
      console.error('No connection type set')
      break
    case 'phantom': {
      const { phantom_encryption_public_key, data, nonce } = action.payload
      const dappKeyPair = yield* select(getDappKeyPair)

      if (!dappKeyPair) return

      const sharedSecretDapp = nacl.box.before(
        bs58.decode(phantom_encryption_public_key),
        dappKeyPair.secretKey
      )
      const connectData = decryptPayload(data, nonce, sharedSecretDapp)
      const { session, public_key } = connectData
      yield* put(
        setSharedSecret({ sharedSecret: bs58.encode(sharedSecretDapp) })
      )
      yield* put(setSession({ session }))
      yield* put(setPublicKey({ publicKey: public_key }))

      const isNewWallet = yield* checkIsNewWallet(public_key, Chain.Sol)
      if (!isNewWallet) return

      const { balance } = yield* getWalletInfo(public_key, Chain.Sol)
      yield* put(
        setIsConnectingWallet({
          wallet: public_key,
          chain: Chain.Sol,
          balance: BigInt(balance.toString())
        })
      )

      eventProperties = {
        chain: Chain.Sol,
        walletAddress: public_key
      }

      const message = `AudiusUserID:${accountUserId}`

      const payload = {
        session,
        message: bs58.encode(Buffer.from(message))
      }

      const [nonce2, encryptedPayload] = encryptPayload(
        payload,
        sharedSecretDapp
      )

      const urlParams = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
        nonce: bs58.encode(nonce2),
        redirect_link: 'audius://wallet-sign-message',
        payload: bs58.encode(encryptedPayload)
      })

      const url = buildUrl('signMessage', urlParams)
      Linking.openURL(url)
      break
    }
    case 'solana-phone-wallet-adapter': {
      const { publicKey } = action.payload
      const publicKeyEncoded = bs58.encode(Buffer.from(publicKey, 'base64'))

      const isNewWallet = yield* checkIsNewWallet(publicKeyEncoded, Chain.Sol)
      if (!isNewWallet) return

      const { balance } = yield* getWalletInfo(publicKeyEncoded, Chain.Sol)

      yield* put(
        setIsConnectingWallet({
          wallet: publicKeyEncoded,
          chain: Chain.Sol,
          balance: BigInt(balance.toString())
        })
      )

      eventProperties = {
        chain: Chain.Sol,
        walletAddress: publicKeyEncoded
      }

      break
    }
    case 'wallet-connect': {
      const { publicKey } = action.payload
      const wallet = getAddress(publicKey)

      const isNewWallet = yield* checkIsNewWallet(wallet, Chain.Eth)
      if (!isNewWallet) return

      const { balance } = yield* getWalletInfo(wallet, Chain.Eth)

      yield* put(
        setIsConnectingWallet({
          wallet,
          chain: Chain.Eth,
          balance: BigInt(balance.toString())
        })
      )

      eventProperties = {
        chain: Chain.Eth,
        walletAddress: wallet
      }

      yield* put(setConnectionStatus({ status: 'connected' }))

      break
    }
  }

  if (eventProperties) {
    analytics.track({
      eventName: Name.CONNECT_WALLET_NEW_WALLET_CONNECTING,
      properties: eventProperties
    })
  }
}

// Connect a wallet to establish a session, but don't connect
// to an Audius account
function* connectAsync(action: ConnectAction) {
  const accountUserId = yield* call(queryCurrentUserId)
  if (!accountUserId) return
  switch (action.payload.connectionType) {
    case null:
      console.error('No connection type set')
      break
    case 'phantom': {
      const { phantom_encryption_public_key, data, nonce } = action.payload
      const dappKeyPair = yield* select(getDappKeyPair)

      if (!dappKeyPair) return

      const sharedSecretDapp = nacl.box.before(
        bs58.decode(phantom_encryption_public_key),
        dappKeyPair.secretKey
      )
      const connectData = decryptPayload(data, nonce, sharedSecretDapp)
      const { session, public_key } = connectData
      yield* put(
        setSharedSecret({ sharedSecret: bs58.encode(sharedSecretDapp) })
      )
      yield* put(setSession({ session }))
      yield* put(setPublicKey({ publicKey: public_key }))
    }
  }
}

export function* watchConnect() {
  yield* takeEvery(connect.type, function* (action: ConnectAction) {
    yield* call(connectAsync, action)
  })
}

export function* watchConnectNewWallet() {
  yield* takeEvery(
    connectNewWallet.type,
    function* (action: ConnectNewWalletAction) {
      const analytics = yield* getContext('analytics')
      try {
        yield* call(connectNewWalletAsync, action)
      } catch (e) {
        const error = `Caught error in connectNewWallet saga:  ${getErrorMessage(
          e
        )}`
        analytics.track({
          eventName: Name.CONNECT_WALLET_ERROR,
          properties: {
            error
          }
        })
      }
    }
  )
}
