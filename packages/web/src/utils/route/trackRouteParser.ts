import { ID } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { OptionalHashId } from '@audius/sdk'
import { matchPath } from 'react-router'

const { TRACK_ID_PAGE, TRACK_PAGE } = route

const safeDecode = (value: string | null | undefined): string | null => {
  if (!value) return null
  try {
    const decoded = decodeURIComponent(value)
    return decoded !== value ? decoded : value
  } catch {
    return value
  }
}

export type TrackRouteParams =
  | { slug: string; trackId: null; handle: string }
  | { slug: null; trackId: ID; handle: null }
  | null

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
      const decodedHandle = safeDecode(handle)
      const decodedSlug = safeDecode(slug)
      if (decodedHandle && decodedSlug) {
        return { slug: decodedSlug, trackId: null, handle: decodedHandle }
      }
    }
  }

  return null
}
