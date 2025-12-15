import { ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { OptionalHashId } from '@audius/sdk'
import { matchPath } from 'react-router-dom'

const { TRACK_ID_PAGE, TRACK_PAGE } = route

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

export type TrackRouteParams =
  | { slug: string; trackId: null; handle: string }
  | { slug: null; trackId: ID; handle: null }
  | null

/**
 * Parses a track route into slug, track id, and handle
 * If the route is a hash id route, track title and handle are not returned, and vice versa
 * @param route
 */
export const parseTrackRoute = (
  route: string | undefined | null
): TrackRouteParams => {
  if (!route || typeof route !== 'string') return null

  const trackIdPageMatch = matchPath(TRACK_ID_PAGE, route)
  if (trackIdPageMatch?.params?.id) {
    const trackId = OptionalHashId.parse(trackIdPageMatch.params.id)
    if (!trackId) return null
    return { slug: null, trackId, handle: null }
  }

  const trackPageMatch = matchPath(TRACK_PAGE, route)
  if (trackPageMatch?.params) {
    const { handle, slug } = trackPageMatch.params as {
      handle?: string
      slug?: string
    }
    if (handle && slug) {
      // Decode handle and slug to prevent double-encoding when used in API calls
      // React Router v6's matchPath can return URL-encoded route parameters
      const decodedHandle = safeDecode(handle)
      const decodedSlug = safeDecode(slug)
      if (decodedHandle && decodedSlug) {
        return { slug: decodedSlug, trackId: null, handle: decodedHandle }
      }
    }
  }

  return null
}
