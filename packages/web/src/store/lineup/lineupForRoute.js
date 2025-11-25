import {
  trendingPageSelectors,
  trackPageSelectors,
  searchResultsPageSelectors,
  libraryPageSelectors,
  profilePageSelectors,
  historyPageSelectors,
  feedPageSelectors,
  collectionPageSelectors
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { matchPath } from 'react-router'

import { getPathname } from 'utils/route'
const {
  FEED_PAGE,
  TRENDING_PAGE,
  SAVED_PAGE,
  HISTORY_PAGE,
  SEARCH_PAGE,
  PLAYLIST_PAGE,
  ALBUM_PAGE,
  TRACK_PAGE,
  PROFILE_PAGE,
  UPLOAD_PAGE,
  DASHBOARD_PAGE,
  SETTINGS_PAGE,
  NOT_FOUND_PAGE,
  LIBRARY_PAGE,
  TRACK_EDIT_PAGE
} = route
const { getCollectionTracksLineup } = collectionPageSelectors
const { getDiscoverFeedLineup } = feedPageSelectors
const { getHistoryTracksLineup } = historyPageSelectors
const { getProfileTracksLineup } = profilePageSelectors
const { getLibraryTracksLineup } = libraryPageSelectors
const { getSearchTracksLineup } = searchResultsPageSelectors
const { getLineup } = trackPageSelectors
const { getCurrentDiscoverTrendingLineup } = trendingPageSelectors

export const getLineupSelectorForRoute = (location) => {
  const matchPage = (path) => {
    const pathname = getPathname(location)
    const match = matchPath(path, pathname)
    return match && match.pathname === pathname
  }

  if (
    matchPage(TRACK_EDIT_PAGE) ||
    matchPage(UPLOAD_PAGE) ||
    matchPage(DASHBOARD_PAGE) ||
    matchPage(SETTINGS_PAGE) ||
    matchPage(NOT_FOUND_PAGE)
  ) {
    return () => null
  }

  if (matchPage(FEED_PAGE)) {
    return getDiscoverFeedLineup
  }
  if (matchPage(TRENDING_PAGE)) {
    return getCurrentDiscoverTrendingLineup
  }
  if (matchPage(SEARCH_PAGE)) {
    return getSearchTracksLineup
  }
  if (matchPage(SAVED_PAGE) || matchPage(LIBRARY_PAGE)) {
    return getLibraryTracksLineup
  }
  if (matchPage(HISTORY_PAGE)) {
    return getHistoryTracksLineup
  }
  if (matchPage(PLAYLIST_PAGE) || matchPage(ALBUM_PAGE)) {
    return getCollectionTracksLineup
  }
  if (matchPage(TRACK_PAGE)) {
    return getLineup
  }
  if (matchPage(PROFILE_PAGE)) {
    return getProfileTracksLineup
  }
  return getDiscoverFeedLineup
}
