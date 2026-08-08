import { recoverTypedDataAddress, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import fetch from '../../utils/fetch'
import type { AudiusWalletClient } from '../AudiusWalletClient'
import type { StorageNodeSelectorService } from '../StorageNodeSelector'

import { Storage } from './Storage'

vi.mock('../../utils/fetch')

const mockFetch = vi.mocked(fetch)

const TEST_PRIVATE_KEY =
  '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318'

const account = privateKeyToAccount(TEST_PRIVATE_KEY)

/**
 * Minimal stand-in for the wallet client, matching signUpload.test.ts: going
 * through viem's real account keeps the signature genuinely verifiable.
 */
const walletClient = {
  account,
  getAddresses: async () => [account.address],
  signTypedData: async (args: any) => account.signTypedData(args)
} as unknown as AudiusWalletClient

const storageNodeSelector = {
  getSelectedNode: async () => 'https://node.example.com'
} as unknown as StorageNodeSelectorService

// Must stay in lockstep with pkg/core/server/upload_request_eip712.go.
const DOMAIN = { name: 'Audius Upload', version: '1' } as const
const TYPES = {
  UploadRequest: [
    { name: 'userId', type: 'uint256' },
    { name: 'timestamp', type: 'uint256' }
  ]
} as const

const previewResponse = (cid: string) =>
  ({ ok: true, json: async () => ({ cid }) }) as unknown as Response

describe('generatePreview', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('signs the request when a wallet and user id are present', async () => {
    mockFetch.mockResolvedValue(previewResponse('preview-cid'))
    const storage = new Storage({
      storageNodeSelector,
      audiusWalletClient: walletClient
    })

    const result = await storage.generatePreview({
      cid: 'some-cid',
      secondOffset: 30,
      userId: 42
    })

    expect(result).toBe('preview-cid')
    const [url, init] = mockFetch.mock.calls[0]! as [URL, RequestInit]
    expect(init.method).toBe('POST')
    expect(url.pathname).toBe('/generate_preview/some-cid/30')

    // The query params carry everything the node needs to rebuild the typed
    // data and recover the signer.
    expect(url.searchParams.get('userId')).toBe('42')
    const timestamp = url.searchParams.get('timestamp')
    expect(timestamp).toMatch(/^\d+$/)
    const recovered = await recoverTypedDataAddress({
      domain: DOMAIN,
      types: TYPES,
      primaryType: 'UploadRequest',
      message: { userId: BigInt(42), timestamp: BigInt(timestamp!) },
      signature: url.searchParams.get('signature') as Hex
    })
    expect(recovered.toLowerCase()).toBe(account.address.toLowerCase())
  })

  it('sends the request unsigned when there is no user id', async () => {
    mockFetch.mockResolvedValue(previewResponse('preview-cid'))
    const storage = new Storage({
      storageNodeSelector,
      audiusWalletClient: walletClient
    })

    await storage.generatePreview({ cid: 'some-cid', secondOffset: 0 })

    const [url] = mockFetch.mock.calls[0]! as [URL]
    expect(url.search).toBe('')
  })

  it('sends the request unsigned when there is no wallet client', async () => {
    mockFetch.mockResolvedValue(previewResponse('preview-cid'))
    const storage = new Storage({ storageNodeSelector })

    await storage.generatePreview({
      cid: 'some-cid',
      secondOffset: 0,
      userId: 42
    })

    const [url] = mockFetch.mock.calls[0]! as [URL]
    expect(url.search).toBe('')
  })

  it('throws on a non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 } as Response)
    const storage = new Storage({ storageNodeSelector })

    await expect(
      storage.generatePreview({ cid: 'some-cid', secondOffset: 15 })
    ).rejects.toThrow('status: 401')
  })
})
