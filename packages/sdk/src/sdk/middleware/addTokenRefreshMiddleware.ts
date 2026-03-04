import type { Middleware, ResponseContext } from '../api/generated/default'
import type { OAuth } from '../oauth/OAuth'

/**
 * Middleware that transparently refreshes an expired access token on 401.
 *
 * When a response comes back with HTTP 401 the middleware delegates to
 * `OAuth.refreshAccessToken()` which checks for a refresh token, performs the
 * HTTP exchange, and updates the token store.  On success the original request
 * is retried with the fresh access token.  On failure the 401 propagates.
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
        return context.response
      }

      // Coalesce concurrent 401s into a single refresh call.
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

      // Retry the original request with the new access token.
      const retryInit: RequestInit = {
        ...context.init,
        headers: {
          ...((context.init.headers as Record<string, string>) ?? {}),
          Authorization: `Bearer ${newAccessToken}`
        }
      }
      return context.fetch(context.url, retryInit)
    }
  }
}
