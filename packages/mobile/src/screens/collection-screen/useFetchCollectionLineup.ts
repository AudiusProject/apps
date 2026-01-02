import { useCallback } from 'react'

import { useCollection } from '@audius/common/api'
import { Kind } from '@audius/common/models'
import {
  collectionPageLineupActions,
  collectionPageSelectors,
  queueSelectors
} from '@audius/common/store'
import { areSetsEqual, dayjs, Uid, makeUid } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { useReachabilityEffect } from 'app/hooks/useReachabilityEffect'
import { getOfflineTrackIds } from 'app/store/offline-downloads/selectors'

import { useHasCollectionChanged } from './useHasCollectionChanged'

const { getCollectionTracksLineup } = collectionPageSelectors
const { getPositions } = queueSelectors

/**
 * Returns a collection lineup, supports boths online and offline
 * @param collectionId the numeric collection id
 */
export const useFetchCollectionLineup = (
  collectionId: number | null,
  fetchLineup: () => void
) => {
  const dispatch = useDispatch()
  const offlineTrackIds = useSelector(
    (state) => new Set(getOfflineTrackIds(state) || []),
    areSetsEqual
  )

  const { data: collectionTrackIds } = useCollection(collectionId, {
    select: (collection) => collection?.playlist_contents.track_ids,
    enabled: false
  })

  const collectionUidSource = `collection:${collectionId}`
  const queuePositions = useSelector(getPositions)
  const queueTrackUids = Object.keys(queuePositions).map(Uid.fromString)
  // Get every UID in the queue whose source references this lineup
  // in the form of { id: [uid1, uid2] }
  const queueUidsByTrackId: Record<number, string[]> = queueTrackUids
    .filter((uid) => uid.source === collectionUidSource)
    .reduce((mapping, uid) => {
      if (uid.id in mapping) {
        mapping[uid.id].push(uid.toString())
      } else {
        mapping[uid.id] = [uid.toString()]
      }
      return mapping
    }, {})

  const collectionTracks = useSelector(getCollectionTracksLineup)
  const collectionTrackUidMap = collectionTracks.entries.reduce(
    (acc, track) => {
      if (acc[track.id] && acc[track.id].includes(track.id)) {
        return acc
      }
      const collectionTrackUid =
        track.uid ?? makeUid(Kind.TRACKS, track.id, collectionUidSource)
      acc[track.id] = acc[track.id]
        ? acc[track.id].concat(collectionTrackUid)
        : [collectionTrackUid]
      return acc
    },
    {}
  ) as Record<number, string[]>

  const fetchLineupOffline = useCallback(() => {
    if (collectionId && collectionTrackIds) {
      const trackIdEncounters = {} as Record<number, number>
      const sortedTracks = collectionTrackIds
        .filter(({ track: trackId }) => offlineTrackIds.has(trackId.toString()))
        .map(({ track: trackId, time }) => {
          trackIdEncounters[trackId] = trackIdEncounters[trackId]
            ? trackIdEncounters[trackId] + 1
            : 0
          return {
            id: trackId,
            kind: Kind.TRACKS,
            uid:
              queueUidsByTrackId[trackId]?.[trackIdEncounters[trackId]] ??
              collectionTrackUidMap[trackId]?.[trackIdEncounters[trackId]] ??
              makeUid(Kind.TRACKS, trackId, collectionUidSource),

            dateAdded: typeof time === 'string' ? dayjs(time) : dayjs.unix(time)
          }
        })

      dispatch(
        collectionPageLineupActions.fetchLineupMetadatasSucceeded(
          sortedTracks,
          0,
          sortedTracks.length,
          0,
          0,
          undefined,
          false /* hasMore override */
        )
      )
    }
  }, [
    collectionId,
    collectionTrackIds,
    dispatch,
    offlineTrackIds,
    queueUidsByTrackId,
    collectionTrackUidMap,
    collectionUidSource
  ])

  // Fetch the lineup based on reachability
  useReachabilityEffect(fetchLineup, fetchLineupOffline)
  useHasCollectionChanged(collectionId as number, fetchLineup)
}
