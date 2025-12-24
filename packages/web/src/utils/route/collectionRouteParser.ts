import { ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { OptionalHashId } from '@audius/sdk'
import { matchPath } from 'react-router'

const {
  PLAYLIST_ID_PAGE,
  PLAYLIST_BY_PERMALINK_PAGE,
  ALBUM_BY_PERMALINK_PAGE
} = route

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

type CollectionRouteParams =
  | {
      collectionId: ID
      handle: string
      collectionType: 'playlist' | 'album'
      title: string
      permalink?: string
    }
  | {
      collectionId: ID
      handle: null
      collectionType: null
      title: null
      permalink?: string
    }
  | {
      collectionId: null
      handle: null
      collectionType: string
      title: null
      permalink: string
    }
  | null

/**
 * Parses a collection route into handle, title, id, and type
 * If the route is a hash id route, title, handle, and type are not returned
 * @param route
 */
export const parseCollectionRoute = (route: string): CollectionRouteParams => {
  const playlistByPermalinkMatch = matchPath(PLAYLIST_BY_PERMALINK_PAGE, route)

  if (playlistByPermalinkMatch) {
    const { handle, slug } = playlistByPermalinkMatch.params ?? {}
    // Decode handle and slug before constructing permalink to prevent double-encoding
    // React Router v6's matchPath can return URL-encoded route parameters
    const decodedHandle = safeDecode(handle)
    const decodedSlug = safeDecode(slug)
    const permalink = `/${decodedHandle}/playlist/${decodedSlug}`
    return {
      title: null,
      collectionId: null,
      permalink,
      handle: null,
      collectionType: 'playlist'
    }
  }
  const albumByPermalinkMatch = matchPath(ALBUM_BY_PERMALINK_PAGE, route)

  if (albumByPermalinkMatch) {
    const { handle, slug } = albumByPermalinkMatch.params ?? {}
    // Decode handle and slug before constructing permalink to prevent double-encoding
    // React Router v6's matchPath can return URL-encoded route parameters
    const decodedHandle = safeDecode(handle)
    const decodedSlug = safeDecode(slug)
    const permalink = `/${decodedHandle}/album/${decodedSlug}`
    return {
      title: null,
      collectionId: null,
      permalink,
      handle: null,
      collectionType: 'album'
    }
  }

  const collectionIdPageMatch = matchPath(PLAYLIST_ID_PAGE, route)
  if (collectionIdPageMatch) {
    const collectionId = OptionalHashId.parse(collectionIdPageMatch.params?.id)
    if (!collectionId) return null
    return { collectionId, handle: null, collectionType: null, title: null }
  }

  return null
}
