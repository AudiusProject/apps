import type { Hedgehog } from '@audius/hedgehog'
import {
  createClient,
  custom,
  CustomTransport,
  type Hex,
  type SignMessageParameters,
  type SignTypedDataParameters,
  type TypedData
} from 'viem'
import { getAddresses, signMessage, signTypedData } from 'viem/actions'

import {
  getSharedSecret,
  type GetSharedSecretParameters
} from './actions/getSharedSecret'
import { HedgehogWalletNotFoundError } from './errors'
import { sign, type SignParameters } from './actions/sign'
import { localTransport } from './localTransport'
import { privateKeyToAudiusAccount } from './privateKeyToAudiusAccount'
import type { AudiusAccount, AudiusWalletClient } from './types'

export { HedgehogWalletNotFoundError }

/**
 * Creates a Viem client that uses a local Hedgehog instance to do all the wallet methods.
 */
export function createHedgehogWalletClient(
  hedgehog: Hedgehog
): AudiusWalletClient {
  // Gets the local privateKeyAccount for the Hedgehog wallet.
  // Unfortunately, Hedgehog loads the wallet asynchronously from storage,
  // so we can't have the account already initialized on start.
  let account_: AudiusAccount | undefined
  const getAccount = async () => {
    await hedgehog.waitUntilReady()
    const wallet = hedgehog.getWallet()
    if (!wallet) {
      throw new HedgehogWalletNotFoundError()
    }

    if (!account_ || account_.address !== wallet.getAddressString()) {
      account_ = privateKeyToAudiusAccount(wallet.getPrivateKeyString() as Hex)
    }
    return account_
  }

  // Init the client as though we have an account
  const client = createClient<CustomTransport, undefined, AudiusAccount>({
    name: 'hedgehog',
    type: 'audius',
    transport: custom(localTransport())
  })

  // Set the account lazily, without making this method async
  getAccount()
    .then((account) => {
      client.account = account
    })
    .catch((e) => {
      if (e instanceof HedgehogWalletNotFoundError) {
        // Do nothing - to be expected if the user is not logged in yet.
        // Throw only if they actually try to do something without a wallet.
        return
      }
      throw e
    })

  // Custom implements each action to inject the account asynchronously, since
  // Hedgehog needs to make the async calls to storage to restore wallets.
  return client.extend((client) => ({
    getAddresses: async () => {
      client.account = await getAccount()
      return getAddresses(client)
    },
    sign: async (args: SignParameters) => {
      client.account = await getAccount()
      return sign(client, args)
    },
    signMessage: async (args: SignMessageParameters<AudiusAccount>) => {
      client.account = await getAccount()
      return signMessage(client, args)
    },
    signTypedData: async <
      const TTypedData extends TypedData | { [key: string]: unknown },
      TPrimaryType extends string
    >(
      args: SignTypedDataParameters<TTypedData, TPrimaryType, AudiusAccount>
    ) => {
      client.account = await getAccount()
      return signTypedData(client, args)
    },
    getSharedSecret: async (args: GetSharedSecretParameters) => {
      client.account = await getAccount()
      return getSharedSecret(client, args)
    }
  }))
}
