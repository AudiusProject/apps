import fetch from 'cross-fetch'

import type { Middleware, ResponseContext } from '../api/generated/default'
import type { OAuthTokenStore } from '../oauth/tokenStore'

/**
 * Shape of the token endpoint's JSON response.
 */
interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
}

/**
 * Exchange a refresh token for a new access + refresh pair.
 * Returns `null` if the refresh itself fails (expired / revoked).
 */
async function exchangeRefreshToken(
  refreshToken: string,
  clientId: string,
  basePath: string
): Promise<TokenResponse | null> {
  try {
    const res = await fetch(`${basePath}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
      })
    })
    if (!res.ok) return null
    const json = await res.json()
    // Validate the response contains the required fields
    if (
      typeof json?.access_token !== 'string' ||
      typeof json?.refresh_token !== 'string' ||
      !json.access_token ||
      !json.refresh_token
    ) {
      return null
    }
    return json as TokenResponse
  } catch {
    // Network error, timeout, invalid JSON, etc.
    return null
  }
}

/**
 * Middleware that transparently refreshes an expired access token on 401.
 *
 * When a response comes back with HTTP 401 and the token store holds a refresh
 * token, the middleware attempts a single refresh.  On success it updates the
 * store and retries the original request.  On failure (refresh token expired
 * or revoked) it lets the 401 propagate.
 */
export const addTokenRefreshMiddleware = ({
  tokenStore,
  apiKey,
  basePath
}: {
  tokenStore: OAuthTokenStore
  apiKey: string
  basePath: string
}): Middleware => {
  let refreshInFlight: Promise<TokenResponse | null> | null = null

  return {
    post: async (context: ResponseContext): Promise<Response | void> => {
      if (context.response.status !== 401) {
        return context.response
      }

      // Snapshot the refresh token — it may be cleared concurrently.
      const currentRefreshToken = tokenStore.refreshToken
      if (!currentRefreshToken) {
        return context.response
      }

      // Coalesce concurrent 401s into a single refresh call.
      if (!refreshInFlight) {
        refreshInFlight = exchangeRefreshToken(
          currentRefreshToken,
          apiKey,
          basePath
        ).finally(() => {
          refreshInFlight = null
        })
      }

      const newTokens = await refreshInFlight
      if (!newTokens) {
        // Refresh failed — surface the original 401.
        return context.response
      }

      tokenStore.setTokens(newTokens.access_token, newTokens.refresh_token)

      // Retry the original request with the new access token.
      const retryInit: RequestInit = {
        ...context.init,
        headers: {
          ...((context.init.headers as Record<string, string>) ?? {}),
          Authorization: `Bearer ${newTokens.access_token}`
        }
      }
      return context.fetch(context.url, retryInit)
    }
  }
}
