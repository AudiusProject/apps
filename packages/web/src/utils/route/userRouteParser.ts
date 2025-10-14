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
export const parseUserRoute = (route: string): UserRouteParams => {
  if (staticRoutes.has(route)) return null

  const userIdPageMatch = matchPath<{ id: string }>(route, {
    path: USER_ID_PAGE,
    exact: true
  })
  if (userIdPageMatch) {
    const userId = OptionalHashId.parse(userIdPageMatch.params.id)
    if (!userId) return null
    return { userId, handle: null, tab: null }
  }

  const profilePageMatch = matchPath<{ handle: string }>(route, {
    path: PROFILE_PAGE,
    exact: true
  })
  if (profilePageMatch) {
    const { handle } = profilePageMatch.params
    return { handle, userId: null, tab: null }
  }

  const commentHistoryMatch = matchPath<{ handle: string }>(route, {
    path: PROFILE_PAGE_COMMENTS,
    exact: true
  })
  if (commentHistoryMatch) {
    const { handle } = commentHistoryMatch.params
    return { handle, userId: null, tab: null }
  }

  const profilePageTabMatch = matchPath<{
    handle: string
    tab: ProfilePageTabRoute
  }>(route, {
    path: `${PROFILE_PAGE}/:tab`,
    exact: true
  })
  if (profilePageTabMatch) {
    const { handle, tab } = profilePageTabMatch.params
    if (
      tab === 'tracks' ||
      tab === 'albums' ||
      tab === 'playlists' ||
      tab === 'reposts'
    ) {
      return { handle, userId: null, tab }
    }
  }

  return null
}
