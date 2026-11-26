import type { Middleware, ResponseContext } from '../api/generated/default'
import type { OAuth } from '../oauth/OAuth'
import fetch from '../utils/fetch'

type DiscardableBody = {
  destroy?: () => void
  cancel?: () => Promise<void>
}

const discardBody = (response: Response) => {
  const body = response.body as DiscardableBody | null
  if (!body) return
  if (typeof body.destroy === 'function') {
    body.destroy()
  } else if (typeof body.cancel === 'function') {
    body.cancel().catch(() => {})
  }
}

/**
 * Middleware that transparently refreshes an expired access token on 401.
 *
 * When a response comes back with HTTP 401 the middleware delegates to
 * `OAuth.refreshAccessToken()` which checks for a refresh token, performs the
 * HTTP exchange, and updates the token store.  On success the original request
 * is retried with the fresh access token.  On failure the 401 propagates.
 *
 * When the client is unauthenticated (no refresh token stored) the middleware
 * short-circuits immediately, avoiding noisy error callbacks.
 */
export const addTokenRefreshMiddleware = ({
  oauth
}: {
  oauth: OAuth
}): Middleware => {
  let refreshInFlight: Promise<string | null> | null = null

  return {
    post: async (context: ResponseContext): Promise<Response | void> => {
      if (context.response.status !== 401) {
        discardBody(context.response)
        return undefined
      }

      if (!(await oauth.hasRefreshToken())) {
        return context.response
      }

      if (!refreshInFlight) {
        refreshInFlight = oauth
          .refreshAccessToken()
          .catch(() => null)
          .finally(() => {
            refreshInFlight = null
          })
      }

      const newAccessToken = await refreshInFlight
      if (!newAccessToken) {
        return context.response
      }

      const retryInit: RequestInit = {
        ...context.init,
        headers: {
          ...((context.init.headers as Record<string, string>) ?? {}),
          Authorization: `Bearer ${newAccessToken}`
        }
      }
      return fetch(context.url, retryInit)
    }
  }
}
