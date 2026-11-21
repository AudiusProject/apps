import { SearchCategory } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { Location } from 'history'
import { matchPath, useLocation } from 'react-router'

import { env } from 'services/env'

import { encodeUrlName } from './urlUtils'

const SIGN_UP_PAGE = '/signup'

export const CREATE_PLAYLIST_PAGE = '/create/playlist'

export const profilePage = (handle: string | null | undefined) => {
  return `/${encodeUrlName(handle ?? '')}`
}

export const collectionPage = (
  handle?: string | null,
  playlistName?: string | null,
  playlistId?: ID | null,
  permalink?: string | null,
  isAlbum?: boolean
) => {
  if (permalink) {
    return permalink
  } else if (playlistName && playlistId && handle) {
    const collectionType = isAlbum ? 'album' : 'playlist'
    return `/${encodeUrlName(handle)}/${collectionType}/${encodeUrlName(
      playlistName
    )}-${playlistId}`
  } else {
    console.error('Missing required arguments to get PlaylistPage route.')
    return ''
  }
}

const USE_HASH_ROUTING = env.USE_HASH_ROUTING

export const BASE_URL = `${env.PUBLIC_PROTOCOL}//${env.PUBLIC_HOSTNAME}`
export const BASE_GA_URL = `${env.PUBLIC_PROTOCOL}//${env.PUBLIC_HOSTNAME}`
const BASENAME = env.BASENAME

export const fullTrackPage = (permalink: string) => {
  return `${BASE_URL}${permalink}`
}

export const trackRemixesPage = (permalink: string) => {
  return `${permalink}/remixes`
}
export const fullTrackRemixesPage = (permalink: string) => {
  return `${fullTrackPage(permalink)}/remixes`
}

export const pickWinnersPage = (permalink: string) => {
  return `${permalink}/pick-winners`
}
export const fullPickWinnersPage = (permalink: string) => {
  return `${fullTrackPage(permalink)}/pick-winners`
}

export const contestPage = (permalink: string) => {
  const [, handle, ...rest] = permalink.split('/')
  return `/${handle}/contest/${rest.join('/')}`
}
export const fullContestPage = (permalink: string) => {
  return `${BASE_URL}${contestPage(permalink)}`
}

export const hostRemixContestPage = (permalink: string) => {
  return `${permalink}/host-contest`
}
export const fullHostRemixContestPage = (permalink: string) => {
  return `${fullTrackPage(permalink)}/host-contest`
}

export const fullAiPage = (handle: string) => {
  return `${fullProfilePage(handle)}/ai`
}

export const fullCommentHistoryPage = (handle: string) => {
  return `${profilePage(handle)}/comments`
}

export const albumPage = (handle: string, title: string, id: ID) => {
  return `/${encodeUrlName(handle)}/album/${encodeUrlName(title)}-${id}`
}

export const fullCollectionPage = (
  handle: string,
  playlistName?: string | null,
  playlistId?: ID | null,
  permalink?: string | null,
  isAlbum?: boolean
) => {
  return `${BASE_URL}${collectionPage(
    handle,
    playlistName,
    playlistId,
    permalink,
    isAlbum
  )}`
}

export const fullProfilePage = (handle: string) => {
  return `${BASE_URL}${profilePage(handle)}`
}

export const weeklyRotationPage = (handle: string) => {
  return `/explore/weekly-rotation/${encodeUrlName(handle)}`
}
export const fullWeeklyRotationPage = (handle: string) => {
  return `${BASE_URL}${weeklyRotationPage(handle)}`
}
export const profilePageAiAttributedTracks = (handle: string) => {
  return `${profilePage(handle)}/ai`
}

export const searchResultsPage = (category: SearchCategory, query: string) => {
  if (category === 'all') {
    return `/search?query=${query}`
  }
  return `/search/${category}/?query=${query}`
}

export const fullSearchResultsPage = (
  category: SearchCategory,
  query: string
) => {
  return `${BASE_URL}${searchResultsPage(category, query)}`
}

export const chatPage = (id: string) => {
  return `/messages/${id}`
}

export const doesMatchRoute = (
  location: Location,
  route: string,
  exact = true
) => {
  const pathname = getPathname(location)
  const match = matchPath(route, pathname)
  if (exact) {
    return match && match.pathname === pathname
  }
  return match
}

export const stripBaseUrl = (url: string) => url.replace(BASE_URL, '')

export const getPathname = (location: Location) => {
  return BASENAME ? location.pathname.replace(BASENAME, '') : location.pathname
}

const recordGoToSignup = (callback: () => void) => {
  if ((window as any).analytics) {
    ;(window as any).analytics.track(
      'Create Account: Open',
      { source: 'landing page' },
      null,
      callback
    )
  } else {
    callback()
  }
}

export const pushWindowRoute = (route: string) => {
  let routeToPush: string
  if (USE_HASH_ROUTING) {
    routeToPush = `/#${route}`
  } else {
    routeToPush = route
  }

  if (route === SIGN_UP_PAGE) {
    recordGoToSignup(() => {
      window.location.href = `${BASENAME}${routeToPush}`
    })
  } else {
    window.location.href = `${BASENAME}${routeToPush}`
  }
}

export const pushUniqueRoute = (location: Location, route: string) => {
  const pathname = getPathname(location)
  if (route !== pathname) {
    return { type: '' }
  }
  return { type: '' }
}

export const matchesRoute = ({
  current,
  target
}: {
  current: string | null
  target: string
}) => {
  return current?.startsWith(target) ?? false
}

export const useMatch = (targetRoute: string) => {
  const location = useLocation()
  return matchesRoute({ current: location.pathname, target: targetRoute })
}
