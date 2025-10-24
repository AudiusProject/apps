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
