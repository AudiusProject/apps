import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockAsyncStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
}

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: mockAsyncStorage
}))

// Import after mock is registered
const { TokenStoreAsyncStorage } = await import('./TokenStoreAsyncStorage')

describe('TokenStoreAsyncStorage — AsyncStorage persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('reads persisted tokens from AsyncStorage', async () => {
    mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'audius_access_token') return 'persisted-access'
      if (key === 'audius_refresh_token') return 'persisted-refresh'
      return null
    })
    const store = new TokenStoreAsyncStorage()
    expect(await store.getAccessToken()).toBe('persisted-access')
    expect(await store.getRefreshToken()).toBe('persisted-refresh')
  })

  it('returns null when AsyncStorage is empty', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null)
    const store = new TokenStoreAsyncStorage()
    expect(await store.getAccessToken()).toBeNull()
    expect(await store.getRefreshToken()).toBeNull()
    expect(await store.getAccessTokenExpiry()).toBeNull()
    expect(await store.getRefreshTokenExpiry()).toBeNull()
  })

  it('setTokens writes tokens to AsyncStorage', async () => {
    mockAsyncStorage.setItem.mockResolvedValue(undefined)
    mockAsyncStorage.removeItem.mockResolvedValue(undefined)
    const store = new TokenStoreAsyncStorage()
    await store.setTokens('at', 'rt')
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'audius_access_token',
      'at'
    )
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'audius_refresh_token',
      'rt'
    )
  })

  it('setTokens writes expiry keys when provided', async () => {
    mockAsyncStorage.setItem.mockResolvedValue(undefined)
    mockAsyncStorage.removeItem.mockResolvedValue(undefined)
    const store = new TokenStoreAsyncStorage()
    await store.setTokens('at', 'rt', 3600, 2592000)
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'audius_access_token_expiry',
      expect.any(String)
    )
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'audius_refresh_token_expiry',
      expect.any(String)
    )
  })

  it('setTokens removes expiry keys when not provided', async () => {
    mockAsyncStorage.setItem.mockResolvedValue(undefined)
    mockAsyncStorage.removeItem.mockResolvedValue(undefined)
    const store = new TokenStoreAsyncStorage()
    await store.setTokens('at', 'rt')
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
      'audius_access_token_expiry'
    )
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
      'audius_refresh_token_expiry'
    )
  })

  it('reads persisted expiry from AsyncStorage', async () => {
    const futureMs = String(Date.now() + 3600000)
    mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'audius_access_token_expiry') return futureMs
      if (key === 'audius_refresh_token_expiry') return futureMs
      return null
    })
    const store = new TokenStoreAsyncStorage()
    expect(await store.getAccessTokenExpiry()).toBe(Number(futureMs))
    expect(await store.getRefreshTokenExpiry()).toBe(Number(futureMs))
  })

  it('returns null for non-numeric expiry values (NaN safety)', async () => {
    mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
      if (key === 'audius_access_token_expiry') return 'corrupted-value'
      if (key === 'audius_refresh_token_expiry') return 'not-a-number'
      return null
    })
    const store = new TokenStoreAsyncStorage()
    expect(await store.getAccessTokenExpiry()).toBeNull()
    expect(await store.getRefreshTokenExpiry()).toBeNull()
  })

  it('clear removes all keys from AsyncStorage', async () => {
    mockAsyncStorage.setItem.mockResolvedValue(undefined)
    mockAsyncStorage.removeItem.mockResolvedValue(undefined)
    const store = new TokenStoreAsyncStorage()
    await store.setTokens('at', 'rt')
    await store.clear()
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
      'audius_access_token'
    )
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
      'audius_refresh_token'
    )
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
      'audius_access_token_expiry'
    )
    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
      'audius_refresh_token_expiry'
    )
  })
})
