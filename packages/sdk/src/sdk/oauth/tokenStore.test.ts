import { describe, it, expect } from 'vitest'

import { OAuthTokenStore } from './tokenStore'

describe('OAuthTokenStore', () => {
  it('starts with null tokens', () => {
    const store = new OAuthTokenStore()
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
  })

  it('setTokens stores both tokens', () => {
    const store = new OAuthTokenStore()
    store.setTokens('access-123', 'refresh-456')
    expect(store.accessToken).toBe('access-123')
    expect(store.refreshToken).toBe('refresh-456')
  })

  it('clear resets both tokens to null', () => {
    const store = new OAuthTokenStore()
    store.setTokens('a', 'r')
    store.clear()
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
  })

  describe('asAccessTokenProvider', () => {
    it('returns empty string when no token is set', async () => {
      const store = new OAuthTokenStore()
      const provider = store.asAccessTokenProvider()
      expect(await provider()).toBe('')
    })

    it('returns the current access token', async () => {
      const store = new OAuthTokenStore()
      store.setTokens('my-token', 'my-refresh')
      const provider = store.asAccessTokenProvider()
      expect(await provider()).toBe('my-token')
    })

    it('reflects token updates after provider was created', async () => {
      const store = new OAuthTokenStore()
      const provider = store.asAccessTokenProvider()

      expect(await provider()).toBe('')

      store.setTokens('token-v1', 'refresh-v1')
      expect(await provider()).toBe('token-v1')

      store.setTokens('token-v2', 'refresh-v2')
      expect(await provider()).toBe('token-v2')

      store.clear()
      expect(await provider()).toBe('')
    })
  })
})
