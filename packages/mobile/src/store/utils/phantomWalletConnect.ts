import type { VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { Linking } from 'react-native'
import type nacl from 'tweetnacl'

import { buildUrl, encryptPayload } from 'app/store/wallet-connect/utils'

export const connect = async (dappKeyPair: nacl.BoxKeyPair) => {
  const params = new URLSearchParams({
    dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
    cluster: 'mainnet-beta',
    app_url: 'https://phantom.app',
    redirect_link: 'audius://connect'
  })

  const url = buildUrl('connect', params)
  Linking.openURL(url)
}

export type SignAndSendTransactionProps = {
  transaction: VersionedTransaction
  session: string
  sharedSecret: Uint8Array
  dappKeyPair: nacl.BoxKeyPair
}

export const signAndSendTransaction = async ({
  transaction,
  session,
  sharedSecret,
  dappKeyPair
}: SignAndSendTransactionProps) => {
  const serializedTransaction = transaction.serialize()

  const payload = {
    session,
    transaction: bs58.encode(serializedTransaction)
  }
  const [nonce, encryptedPayload] = encryptPayload(payload, sharedSecret)

  const params = new URLSearchParams({
    dapp_encryption_public_key: bs58.encode(dappKeyPair.publicKey),
    nonce: bs58.encode(nonce),
    redirect_link: 'audius://',
    payload: bs58.encode(encryptedPayload)
  })

  const url = buildUrl('signAndSendTransaction', params)
  Linking.openURL(url)
}
