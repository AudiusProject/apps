import { describe, it, expect } from 'vitest'

import { TokenStoreMemory } from './TokenStoreMemory'

describe('TokenStoreMemory', () => {
  it('starts with null tokens and expiries', async () => {
    const store = new TokenStoreMemory()
    expect(await store.getAccessToken()).toBeNull()
    expect(await store.getRefreshToken()).toBeNull()
    expect(await store.getAccessTokenExpiry()).toBeNull()
    expect(await store.getRefreshTokenExpiry()).toBeNull()
  })

  it('setTokens stores both tokens', async () => {
    const store = new TokenStoreMemory()
    await store.setTokens('access-123', 'refresh-456')
    expect(await store.getAccessToken()).toBe('access-123')
    expect(await store.getRefreshToken()).toBe('refresh-456')
  })

  it('setTokens stores expiry when expiresIn is provided', async () => {
    const store = new TokenStoreMemory()
    const before = Date.now()
    await store.setTokens('at', 'rt', 3600)
    const expiry = await store.getAccessTokenExpiry()
    expect(expiry).toBeGreaterThanOrEqual(before + 3600 * 1000)
    expect(expiry).toBeLessThanOrEqual(Date.now() + 3600 * 1000)
  })

  it('setTokens stores refresh expiry when refreshExpiresIn is provided', async () => {
    const store = new TokenStoreMemory()
    const before = Date.now()
    await store.setTokens('at', 'rt', 3600, 2592000)
    const expiry = await store.getRefreshTokenExpiry()
    expect(expiry).toBeGreaterThanOrEqual(before + 2592000 * 1000)
    expect(expiry).toBeLessThanOrEqual(Date.now() + 2592000 * 1000)
  })

  it('setTokens leaves expiry null when not provided', async () => {
    const store = new TokenStoreMemory()
    await store.setTokens('at', 'rt')
    expect(await store.getAccessTokenExpiry()).toBeNull()
    expect(await store.getRefreshTokenExpiry()).toBeNull()
  })

  it('clear resets all values to null', async () => {
    const store = new TokenStoreMemory()
    await store.setTokens('a', 'r', 3600, 2592000)
    await store.clear()
    expect(await store.getAccessToken()).toBeNull()
    expect(await store.getRefreshToken()).toBeNull()
    expect(await store.getAccessTokenExpiry()).toBeNull()
    expect(await store.getRefreshTokenExpiry()).toBeNull()
  })
})
