import { describe, it, expect } from 'vitest'

import { TokenStoreMemory } from './TokenStoreMemory'

describe('TokenStoreMemory', () => {
  it('starts with null tokens', async () => {
    const store = new TokenStoreMemory()
    expect(await store.getAccessToken()).toBeNull()
    expect(await store.getRefreshToken()).toBeNull()
  })

  it('setTokens stores both tokens', async () => {
    const store = new TokenStoreMemory()
    await store.setTokens('access-123', 'refresh-456')
    expect(await store.getAccessToken()).toBe('access-123')
    expect(await store.getRefreshToken()).toBe('refresh-456')
  })

  it('clear resets both tokens to null', async () => {
    const store = new TokenStoreMemory()
    await store.setTokens('a', 'r')
    await store.clear()
    expect(await store.getAccessToken()).toBeNull()
    expect(await store.getRefreshToken()).toBeNull()
  })
})
