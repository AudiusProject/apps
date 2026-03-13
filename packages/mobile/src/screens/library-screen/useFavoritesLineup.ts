import { useCallback, useEffect } from 'react'

import { Kind } from '@audius/common/models'
import {
  libraryPageTracksLineupActions,
  libraryPageSelectors
} from '@audius/common/store'
import { makeUid } from '@audius/common/utils'
import { orderBy } from 'lodash'
import { useDispatch, useSelector } from 'react-redux'

import { useReachabilityEffect } from 'app/hooks/useReachabilityEffect'
import { DOWNLOAD_REASON_FAVORITES } from 'app/store/offline-downloads/constants'
import { useOfflineTracks } from 'app/store/offline-downloads/hooks'

const { getLibraryTracksLineup } = libraryPageSelectors

/**
 * Returns a favorites lineup, supports boths online and offline
 * @param fetchLineup the numeric collection id
 */
export const useFavoritesLineup = (fetchLineup: () => void) => {
  const dispatch = useDispatch()
  const offlineTracks = useOfflineTracks()
  const savedTracks = useSelector(getLibraryTracksLineup)
  const savedTracksUidMap = savedTracks.entries.reduce((acc, track) => {
    acc[track.id] = track.uid
    return acc
  }, {})
  const lineup = useSelector(getLibraryTracksLineup)

  const fetchLineupOffline = useCallback(() => {
    const lineupTracks = offlineTracks
      .filter((track) =>
        track.offline?.reasons_for_download.some(
          (reason) => reason.collection_id === DOWNLOAD_REASON_FAVORITES
        )
      )
      .map((track) => ({
        uid:
          savedTracksUidMap[track.track_id] ??
          makeUid(Kind.TRACKS, track.track_id),
        id: track.track_id,
        dateSaved: track.offline?.favorite_created_at,
        kind: Kind.TRACKS
      }))

    // Reorder lineup tracks according to favorite time
    const sortedTracks = orderBy(lineupTracks, (track) => track.dateSaved, [
      'desc'
    ])
    dispatch(
      libraryPageTracksLineupActions.fetchLineupMetadatasSucceeded(
        sortedTracks,
        0,
        sortedTracks.length,
        0,
        0
      )
    )
  }, [dispatch, offlineTracks, savedTracksUidMap])

  const fetchLineupOnline = useCallback(() => {
    // Because we do `fetchLineupMetadatasSucceeded` in fetchLineupOffline
    // we need to manually set the lineup as loading here. This is so if the app is started
    // offline and then reconnects, we show a spinner while loading instead of the empty message
    dispatch(libraryPageTracksLineupActions.setLoading())
    fetchLineup()
  }, [dispatch, fetchLineup])

  // Fetch the lineup based on reachability
  useReachabilityEffect(fetchLineupOnline, fetchLineupOffline)

  useEffect(() => {
    if (fetchLineupOnline) {
      fetchLineupOnline()
    }
  }, [fetchLineupOnline])

  return lineup
}
