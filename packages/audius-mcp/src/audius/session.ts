import { sdk as createSdk } from '@audius/sdk'
import type { AudiusSdk } from '@audius/sdk'

import { callbackUrl, type Config } from '../config.js'

export const APP_NAME = 'Audius MCP'

export type AudiusUser = {
  id: string
  handle: string
  name: string
}

export type AudiusSession = {
  sdk: AudiusSdk
  beginLogin: () => Promise<{ url: string; state: string }>
  completeLogin: (redirectUrl: string) => Promise<AudiusUser>
  logout: () => Promise<void>
}

export type AudiusSessionFactory = () => AudiusSession

class MemoryTokenStore {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private accessTokenExpiry: number | null = null
  private refreshTokenExpiry: number | null = null

  async getAccessToken() {
    return this.accessToken
  }

  async getRefreshToken() {
    return this.refreshToken
  }

  async getAccessTokenExpiry() {
    return this.accessTokenExpiry
  }

  async getRefreshTokenExpiry() {
    return this.refreshTokenExpiry
  }

  async setTokens(
    access: string,
    refresh: string,
    expiresIn?: number,
    refreshExpiresIn?: number
  ) {
    this.accessToken = access
    this.refreshToken = refresh
    this.accessTokenExpiry =
      expiresIn != null ? Date.now() + expiresIn * 1000 : null
    this.refreshTokenExpiry =
      refreshExpiresIn != null ? Date.now() + refreshExpiresIn * 1000 : null
  }

  async clear() {
    this.accessToken = null
    this.refreshToken = null
    this.accessTokenExpiry = null
    this.refreshTokenExpiry = null
  }
}

export const createAudiusSessionFactory =
  (config: Config): AudiusSessionFactory =>
  () => {
    const redirectUri = callbackUrl(config)
    const sdk = createSdk({
      appName: APP_NAME,
      apiKey: config.apiKey,
      redirectUri,
      environment: config.environment,
      services: { tokenStore: new MemoryTokenStore() }
    })

    return {
      sdk,
      beginLogin: () =>
        new Promise((resolve, reject) => {
          sdk.oauth
            .login({
              scope: 'write',
              redirectUri,
              display: 'fullScreen',
              responseMode: 'query',
              openUrl: (url) => {
                const state = new URL(url).searchParams.get('state')
                if (!state) {
                  reject(new Error('Audius login URL is missing state'))
                  return
                }
                resolve({ url, state })
              }
            })
            .catch(reject)
        }),
      completeLogin: async (redirectUrl) => {
        await sdk.oauth.handleRedirect(redirectUrl)
        if (!(await sdk.oauth.isAuthenticated())) {
          throw new Error('Audius sign-in did not complete')
        }
        const user = await sdk.oauth.getUser()
        return { id: user.id, handle: user.handle, name: user.name }
      },
      logout: () => sdk.oauth.logout()
    }
  }
