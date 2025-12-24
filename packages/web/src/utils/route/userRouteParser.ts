import { ID } from '@audius/common/models'
import { PROFILE_PAGE_COMMENTS } from '@audius/common/src/utils/route'
import { ProfilePageTabRoute } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { OptionalHashId } from '@audius/sdk'
import { matchPath } from 'react-router'

const { USER_ID_PAGE, PROFILE_PAGE, staticRoutes } = route

/**
 * Safely decodes a string if it's URL-encoded, otherwise returns as-is.
 * This prevents double-encoding when values that are already encoded get encoded again.
 * Needed because React Router v6's matchPath can return URL-encoded route parameters.
 */
const safeDecode = (value: string | null | undefined): string | null => {
  if (!value) return null
  try {
    // Try to decode - if it changes, it was encoded; otherwise use original
    const decoded = decodeURIComponent(value)
    return decoded !== value ? decoded : value
  } catch {
    // If decoding fails, the value wasn't properly encoded or contains invalid sequences
    return value
  }
}

type UserRouteParams =
  | { handle: string; userId: null; tab: null }
  | { handle: string; userId: null; tab: ProfilePageTabRoute }
  | { handle: null; userId: ID; tab: null }
  | null

/**
 * Parses a user route into handle or id
 * @param route
 */
export const parseUserRoute = (
  route: string | undefined | null
): UserRouteParams => {
  if (!route || typeof route !== 'string' || staticRoutes.has(route))
    return null

  const userIdPageMatch = matchPath(USER_ID_PAGE, route)
  if (userIdPageMatch?.params?.id) {
    const userId = OptionalHashId.parse(userIdPageMatch.params.id)
    if (!userId) return null
    return { userId, handle: null, tab: null }
  }

  const profilePageMatch = matchPath(PROFILE_PAGE, route)
  if (profilePageMatch?.params?.handle) {
    const { handle } = profilePageMatch.params
    // Decode handle to prevent double-encoding when used in API calls
    // React Router v6's matchPath can return URL-encoded route parameters
    const decodedHandle = safeDecode(handle)
    if (decodedHandle) {
      return { handle: decodedHandle, userId: null, tab: null }
    }
  }

  const commentHistoryMatch = matchPath(PROFILE_PAGE_COMMENTS, route)
  if (commentHistoryMatch?.params?.handle) {
    const { handle } = commentHistoryMatch.params
    // Decode handle to prevent double-encoding when used in API calls
    const decodedHandle = safeDecode(handle)
    if (decodedHandle) {
      return { handle: decodedHandle, userId: null, tab: null }
    }
  }

  const profilePageTabMatch = matchPath(`${PROFILE_PAGE}/:tab`, route)
  if (profilePageTabMatch?.params) {
    const { handle, tab } = profilePageTabMatch.params as {
      handle?: string
      tab?: string
    }
    if (
      handle &&
      (tab === 'tracks' ||
        tab === 'albums' ||
        tab === 'playlists' ||
        tab === 'reposts')
    ) {
      // Decode handle to prevent double-encoding when used in API calls
      const decodedHandle = safeDecode(handle)
      if (decodedHandle) {
        return {
          handle: decodedHandle,
          userId: null,
          tab: tab as ProfilePageTabRoute
        }
      }
    }
  }

  return null
}
