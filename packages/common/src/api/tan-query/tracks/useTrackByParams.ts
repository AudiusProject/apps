import { useEffect } from 'react'

import { useDispatch, useSelector } from 'react-redux'

import { Kind } from '~/models'
import { ID } from '~/models/Identifiers'
import { trackPageLineupActions, trackPageSelectors } from '~/store/pages'
import { tracksActions } from '~/store/pages/track/lineup/actions'
import { makeUid } from '~/utils/uid'

import { useTrackPageLineup } from '../lineups/useTrackPageLineup'
import { QueryOptions } from '../types'

import { useTrack } from './useTrack'
import { useTrackByPermalink } from './useTrackByPermalink'

type TrackParams = {
  handle?: string | null
  slug?: string | null
  trackId?: ID | null
}

/**
 * Hook that returns track data given either a track ID or a handle + slug.
 * Internally uses useTrack and useTrackByPermalink for consistent behavior.
 * @param params The track params - either {id} or {handle, slug}
 * @returns The track data or null if not found
 */
export const useTrackByParams = (
  params: TrackParams | null,
  options?: QueryOptions
) => {
  const { handle, slug, trackId } = params ?? {}
  const permalink = handle ? `/${handle}/${slug}` : null

  const dispatch = useDispatch()
  const trackQuery = useTrack(trackId, options)
  const permalinkQuery = useTrackByPermalink(permalink, options)
  const source = useSelector(trackPageSelectors.getSourceSelector)

  const query = trackId ? trackQuery : permalinkQuery

  const { data: track, isSuccess } = query

  const fetchTrackId = track?.track_id
  const { isPending } = useTrackPageLineup(
    { trackId: fetchTrackId },
    { enabled: false }
  )

  useEffect(() => {
    if (track && isSuccess && isPending) {
      const { track_id } = track

      // Reset lineup before adding the hero track
      dispatch(tracksActions.reset())
      // Add hero track to lineup early so that we can play it ASAP
      // instead of waiting for the entire lineup to load
      dispatch(
        trackPageLineupActions.tracksActions.add(
          {
            kind: Kind.TRACKS,
            id: track_id,
            uid: makeUid(Kind.TRACKS, track_id, source),
            ...track
          },
          track_id
        )
      )
    }
  }, [isSuccess, track, dispatch, source, isPending])

  return query
}
