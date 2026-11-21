import { ID } from '~/models/Identifiers'

import { QueryOptions } from '../types'

import { useTrack } from './useTrack'
import { useTrackByPermalink } from './useTrackByPermalink'

type TrackParams = {
  handle?: string | null
  slug?: string | null
  trackId?: ID | null
}

export const useTrackByParams = (
  params: TrackParams | null,
  options?: QueryOptions
) => {
  const { handle, slug, trackId } = params ?? {}
  const permalink = handle ? `/${handle}/${slug}` : null

  const trackQuery = useTrack(trackId, options)
  const permalinkQuery = useTrackByPermalink(permalink, options)

  return trackId ? trackQuery : permalinkQuery
}
