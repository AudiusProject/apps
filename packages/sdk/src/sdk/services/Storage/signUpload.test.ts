import { recoverTypedDataAddress, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { describe, expect, it } from 'vitest'

import type { AudiusWalletClient } from '../AudiusWalletClient'

import { signUpload } from './signUpload'

const TEST_PRIVATE_KEY =
  '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318'

const account = privateKeyToAccount(TEST_PRIVATE_KEY)

/**
 * Minimal stand-in for the wallet client: signUpload only needs an address and
 * signTypedData, and going through viem's real account keeps the signature
 * genuinely verifiable rather than mocked.
 */
const walletClient = {
  account,
  getAddresses: async () => [account.address],
  signTypedData: async (args: any) => account.signTypedData(args)
} as unknown as AudiusWalletClient

// Must stay in lockstep with pkg/core/server/upload_request_eip712.go.
const DOMAIN = { name: 'Audius Upload', version: '1' } as const
const TYPES = {
  UploadRequest: [
    { name: 'userId', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' }
  ]
} as const

describe('signUpload', () => {
  // Everything the verifier needs to rebuild the typed data comes back
  // together; an EIP-712 signature does not carry its own message.
  it('returns the signature and every field it covers', async () => {
    const result = await signUpload({
      audiusWalletClient: walletClient,
      userId: 42,
      timestamp: 1700000000000
    })

    expect(result.signature).toMatch(/^0x[0-9a-f]{130}$/i)
    expect(result.userId).toBe(42)
    expect(result.timestamp).toBe(1700000000000)
  })

  // The validator reconstructs the typed data from userId and timestamp and
  // recovers against it. If the domain or types drift from the Go side, every
  // upload fails auth — so pin the exact shape here.
  it('signs the agreed typed data', async () => {
    const { signature, timestamp } = await signUpload({
      audiusWalletClient: walletClient,
      userId: 7,
      timestamp: 1700000000000
    })

    const recovered = await recoverTypedDataAddress({
      domain: DOMAIN,
      types: TYPES,
      primaryType: 'UploadRequest',
      message: { userId: BigInt(7), timestamp: BigInt(timestamp) },
      signature: signature as Hex
    })

    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase())
  })

  it('binds the signature to the user id', async () => {
    const [a, b] = await Promise.all([
      signUpload({
        audiusWalletClient: walletClient,
        userId: 1,
        timestamp: 1700000000000
      }),
      signUpload({
        audiusWalletClient: walletClient,
        userId: 2,
        timestamp: 1700000000000
      })
    ])

    expect(a.signature).not.toBe(b.signature)
  })

  it('binds the signature to the timestamp', async () => {
    const [a, b] = await Promise.all([
      signUpload({
        audiusWalletClient: walletClient,
        userId: 1,
        timestamp: 1700000000000
      }),
      signUpload({
        audiusWalletClient: walletClient,
        userId: 1,
        timestamp: 1700000000001
      })
    ])

    expect(a.signature).not.toBe(b.signature)
  })

  it('throws when no wallet address is available', async () => {
    const empty = {
      getAddresses: async () => []
    } as unknown as AudiusWalletClient

    await expect(
      signUpload({ audiusWalletClient: empty, userId: 1 })
    ).rejects.toThrow('No wallet available')
  })
})
