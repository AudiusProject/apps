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

  it('clear removes tokens from localStorage', async () => {
    const store = new TokenStoreLocalStorage()
    await store.setTokens('at', 'rt')
    await store.clear()
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'audius_access_token'
    )
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'audius_refresh_token'
    )
  })
})
