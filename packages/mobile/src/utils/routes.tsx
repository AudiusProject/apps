import type { User, UserCollectionMetadata } from '@audius/common/models'
import { encodeUrlName } from '@audius/common/utils'

import { env } from 'app/services/env'

type UserHandle = Pick<User, 'handle'>

const { AUDIUS_URL } = env

export const getTrackRoute = (
  track: { permalink: string },
  fullUrl = false
) => {
  const route = track.permalink
  return fullUrl ? `${AUDIUS_URL}${route}` : route
}

export const getContestRoute = (
  track: { permalink: string; contestPermalink?: string },
  fullUrl = false
) => {
  // If the event has its own permalink from event_routes, use it directly.
  if (track.contestPermalink) {
    const route = track.contestPermalink
    return fullUrl ? `${AUDIUS_URL}${route}` : route
  }
  // Fallback: derive contest URL from the track permalink.
  // `/{handle}/{slug}` → `/{handle}/contest/{slug}`.
  const [, handle, ...rest] = track.permalink.split('/')
  const route = `/${handle}/contest/${rest.join('/')}`
  return fullUrl ? `${AUDIUS_URL}${route}` : route
}

export const getUserRoute = (user: UserHandle, fullUrl = false) => {
  const route = `/${encodeUrlName(user.handle)}`
  return fullUrl ? `${AUDIUS_URL}${route}` : route
}

export const getCollectionRoute = (
  collection: Pick<UserCollectionMetadata, 'permalink'>,
  fullUrl = false
) => {
  const { permalink } = collection
  if (!permalink) return ''

  return fullUrl ? `${AUDIUS_URL}${permalink}` : permalink
}

export const getSearchRoute = (query: string, fullUrl = false) => {
  const route = `/search/${encodeUrlName(query)}`
  return fullUrl ? `${AUDIUS_URL}${route}` : route
}

export const getTagSearchRoute = (query: string, fullUrl = false) => {
  const route = `/search/#${encodeUrlName(query)}`
  return fullUrl ? `${AUDIUS_URL}${route}` : route
}

export const getEmptyPageRoute = (fullUrl = false) => {
  const route = `/empty_page`
  return fullUrl ? `${AUDIUS_URL}${route}` : route
}

export const getAudioPageRoute = () => {
  return '/audio'
}
