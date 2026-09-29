// @vitest-environment jsdom
import { PropsWithChildren } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import nacl from 'tweetnacl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCoinflowSessionKey } from './useCoinflowSessionKey'

const mocks = vi.hoisted(() => ({
  addresses: { currentUser: '0xabc', web3User: '0xabc' } as {
    currentUser: string | null
    web3User: string | null
  },
  getKeypair: vi.fn(),
  createSession: vi.fn()
}))

vi.mock('~/api', () => ({
  useWalletAddresses: () => ({ data: mocks.addresses })
}))
vi.mock('~/api/tan-query/utils', () => ({
  useQueryContext: () => ({
    identityService: {
      identityServiceEndpoint: 'https://identity.example',
      createCoinflowSessionKey: mocks.createSession
    },
    solanaWalletService: { getKeypair: mocks.getKeypair }
  })
}))

const keys = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(1))
const minutes = (value: number) => value * 60 * 1000
const session = (key: string) => ({ key, expiresAt: Date.now() + minutes(30) })
let client: QueryClient

function Wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const flush = async (ms = 10) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-28T12:00:00Z'))
  vi.clearAllMocks()
  mocks.addresses = { currentUser: '0xabc', web3User: '0xabc' }
  mocks.getKeypair.mockResolvedValue({
    publicKey: { toBase58: () => 'wallet-a' },
    secretKey: keys.secretKey
  })
  mocks.createSession.mockImplementation(async () => session('key-a'))
  client = new QueryClient()
})

afterEach(() => {
  cleanup()
  client.clear()
  vi.useRealTimers()
})

describe('useCoinflowSessionKey', () => {
  const props = {
    wallet: 'wallet-a',
    environment: 'sandbox' as const,
    enabled: true
  }

  it('waits until opened, then signs proof for the active identity and wallet', async () => {
    const { result, rerender } = renderHook(useCoinflowSessionKey, {
      wrapper: Wrapper,
      initialProps: { ...props, enabled: false }
    })
    await flush()
    expect(mocks.createSession).not.toHaveBeenCalled()
    expect(result.current.sessionKey).toBeUndefined()
    rerender(props)
    await flush()
    expect(result.current.sessionKey).toBe('key-a')
    const proof = mocks.createSession.mock.calls[0][0]
    const message = `Audius Coinflow session:0xabc:wallet-a:sandbox:${proof.timestamp}`
    expect(
      nacl.sign.detached.verify(
        new Uint8Array(Buffer.from(message)),
        new Uint8Array(Buffer.from(proof.signature, 'base64')),
        keys.publicKey
      )
    ).toBe(true)
  })

  it('refreshes before expiry and stops using the old key if refresh fails', async () => {
    const { result } = renderHook(useCoinflowSessionKey, {
      wrapper: Wrapper,
      initialProps: props
    })
    await flush()
    expect(result.current.sessionKey).toBe('key-a')
    mocks.createSession.mockRejectedValue(new Error('Network error'))
    await flush(minutes(25) + 2000)
    expect(mocks.createSession.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(result.current.sessionKey).toBe('key-a')
    await flush(minutes(4))
    expect(result.current.sessionKey).toBeUndefined()
    expect(result.current.isError).toBe(true)
    mocks.createSession.mockResolvedValue(session('key-refreshed'))
    await act(async () => {
      await result.current.retry()
    })
    await flush()
    expect(result.current.sessionKey).toBe('key-refreshed')
  })

  it('does not reuse a key across account changes or logout', async () => {
    const { result, rerender } = renderHook(useCoinflowSessionKey, {
      wrapper: Wrapper,
      initialProps: props
    })
    await flush()
    expect(result.current.sessionKey).toBe('key-a')
    mocks.addresses = { currentUser: '0xdef', web3User: '0xdef' }
    mocks.createSession.mockImplementation(async () => session('key-b'))
    rerender(props)
    expect(result.current.sessionKey).toBeUndefined()
    await flush()
    expect(result.current.sessionKey).toBe('key-b')
    mocks.addresses = { currentUser: null, web3User: null }
    rerender(props)
    expect(result.current.sessionKey).toBeUndefined()
  })

  it('ignores late session responses after a wallet switch', async () => {
    let resolveOld!: (value: { key: string; expiresAt: number }) => void
    mocks.createSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        })
    )
    const { result, rerender } = renderHook(useCoinflowSessionKey, {
      wrapper: Wrapper,
      initialProps: props
    })
    await flush()
    mocks.getKeypair.mockResolvedValue({
      publicKey: { toBase58: () => 'wallet-b' },
      secretKey: keys.secretKey
    })
    mocks.createSession.mockResolvedValue(session('key-b'))
    rerender({ ...props, wallet: 'wallet-b' })
    await flush()
    expect(result.current.sessionKey).toBe('key-b')
    resolveOld(session('key-a'))
    await flush()
    expect(result.current.sessionKey).toBe('key-b')
  })

  it('rejects an adapter whose wallet no longer matches the signing wallet', async () => {
    const { result } = renderHook(useCoinflowSessionKey, {
      wrapper: Wrapper,
      initialProps: { ...props, wallet: 'stale-wallet' }
    })
    await flush(2000)
    expect(mocks.createSession).not.toHaveBeenCalled()
    expect(result.current.sessionKey).toBeUndefined()
    expect(result.current.isError).toBe(true)
  })

  it('discards invalid or already expired credentials', async () => {
    mocks.createSession.mockResolvedValue({
      key: 'expired',
      expiresAt: Date.now()
    })
    const { result } = renderHook(useCoinflowSessionKey, {
      wrapper: Wrapper,
      initialProps: props
    })
    await flush(2000)
    expect(result.current.sessionKey).toBeUndefined()
    expect(result.current.isError).toBe(true)
  })
})
