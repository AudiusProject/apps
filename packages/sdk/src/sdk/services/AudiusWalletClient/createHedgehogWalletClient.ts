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
import { sign, type SignParameters } from './actions/sign'
import { localTransport } from './localTransport'
import { privateKeyToAudiusAccount } from './privateKeyToAudiusAccount'
import type { AudiusAccount, AudiusWalletClient } from './types'

/**
 * The parts of a Hedgehog instance this client needs. Satisfied by both the
 * @audius/common Hedgehog and the @audius/hedgehog package.
 */
export type HedgehogLike = {
  waitUntilReady: () => Promise<void>
  getWallet: () => {
    getAddressString: () => string
    getPrivateKeyString: () => string
  } | null
}

export class HedgehogWalletNotFoundError extends Error {
  constructor() {
    super('Hedgehog wallet not found. Is the user logged in?')
  }
}

/**
 * Creates a Viem client that uses a local Hedgehog instance to do all the wallet methods.
 */
export function createHedgehogWalletClient(
  hedgehog: HedgehogLike
): AudiusWalletClient {
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

  const client = createClient<CustomTransport, undefined, AudiusAccount>({
    name: 'hedgehog',
    type: 'audius',
    transport: custom(localTransport())
  })

  getAccount()
    .then((account) => {
      client.account = account
    })
    .catch((e) => {
      if (e instanceof HedgehogWalletNotFoundError) {
        return
      }
      throw e
    })

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
