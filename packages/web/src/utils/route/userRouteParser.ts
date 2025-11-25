import { ID } from '@audius/common/models'
import { PROFILE_PAGE_COMMENTS } from '@audius/common/src/utils/route'
import { ProfilePageTabRoute } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { OptionalHashId } from '@audius/sdk'
import { matchPath } from 'react-router-dom'

const { USER_ID_PAGE, PROFILE_PAGE, staticRoutes } = route

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
    return { handle, userId: null, tab: null }
  }

  const commentHistoryMatch = matchPath(PROFILE_PAGE_COMMENTS, route)
  if (commentHistoryMatch?.params?.handle) {
    const { handle } = commentHistoryMatch.params
    return { handle, userId: null, tab: null }
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
      return { handle, userId: null, tab: tab as ProfilePageTabRoute }
    }
  }

  return null
}
