import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { TokenStoreLocalStorage } from './TokenStoreLocalStorage'

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

describe('TokenStoreLocalStorage — localStorage persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: mockLocalStorage })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('reads persisted tokens from localStorage', async () => {
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'audius_access_token') return 'persisted-access'
      if (key === 'audius_refresh_token') return 'persisted-refresh'
      return null
    })
    const store = new TokenStoreLocalStorage()
    expect(await store.getAccessToken()).toBe('persisted-access')
    expect(await store.getRefreshToken()).toBe('persisted-refresh')
  })

  it('returns null when localStorage is empty', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    const store = new TokenStoreLocalStorage()
    expect(await store.getAccessToken()).toBeNull()
    expect(await store.getRefreshToken()).toBeNull()
    expect(await store.getAccessTokenExpiry()).toBeNull()
    expect(await store.getRefreshTokenExpiry()).toBeNull()
  })

  it('setTokens writes to localStorage', async () => {
    const store = new TokenStoreLocalStorage()
    await store.setTokens('at', 'rt')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'audius_access_token',
      'at'
    )
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'audius_refresh_token',
      'rt'
    )
  })

  it('setTokens writes expiry keys when provided', async () => {
    const store = new TokenStoreLocalStorage()
    await store.setTokens('at', 'rt', 3600, 2592000)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'audius_access_token_expiry',
      expect.any(String)
    )
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'audius_refresh_token_expiry',
      expect.any(String)
    )
  })

  it('setTokens removes expiry keys when not provided', async () => {
    const store = new TokenStoreLocalStorage()
    await store.setTokens('at', 'rt')
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'audius_access_token_expiry'
    )
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'audius_refresh_token_expiry'
    )
  })

  it('reads persisted expiry from localStorage', async () => {
    const futureMs = String(Date.now() + 3600000)
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'audius_access_token_expiry') return futureMs
      if (key === 'audius_refresh_token_expiry') return futureMs
      return null
    })
    const store = new TokenStoreLocalStorage()
    expect(await store.getAccessTokenExpiry()).toBe(Number(futureMs))
    expect(await store.getRefreshTokenExpiry()).toBe(Number(futureMs))
  })

  it('clear removes all keys from localStorage', async () => {
    const store = new TokenStoreLocalStorage()
    await store.setTokens('at', 'rt')
    await store.clear()
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'audius_access_token'
    )
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'audius_refresh_token'
    )
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'audius_access_token_expiry'
    )
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'audius_refresh_token_expiry'
    )
  })
})
