import { Kind } from '@audius/common/models'
import {
  collectionPageLineupActions,
  collectionPageSelectors
} from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import { put, select } from 'typed-redux-saga'

import type { Track } from '@audius/common/models'
import type { ID, UID } from '@audius/common/models'

/**
 * Updates the collection page lineup with minimal changes (add/remove/order)
 * instead of a full refresh. This preserves scroll position since we're not
 * replacing the entire entries array.
 */
export function* addTrackToCollectionLineupIfViewing(
  playlistId: ID,
  track: Track,
  trackUid: UID
) {
  const collectionId: ID | null = yield* select(
    collectionPageSelectors.getCollectionId
  )
  if (collectionId !== playlistId) return

  const entry = {
    ...track,
    uid: trackUid,
    dateAdded: dayjs()
  }
  yield* put(
    collectionPageLineupActions.add(entry, track.track_id)
  )
}

export function* removeTrackFromCollectionLineupIfViewing(
  playlistId: ID,
  trackUid: UID
) {
  const collectionId: ID | null = yield* select(
    collectionPageSelectors.getCollectionId
  )
  if (collectionId !== playlistId) return

  yield* put(collectionPageLineupActions.remove(Kind.TRACKS, trackUid))
}

export function* updateCollectionLineupOrderIfViewing(
  playlistId: ID,
  trackIdsInOrder: ID[]
) {
  const collectionId: ID | null = yield* select(
    collectionPageSelectors.getCollectionId
  )
  if (collectionId !== playlistId) return

  const lineup = yield* select(
    collectionPageSelectors.getCollectionTracksLineup
  )
  if (!lineup?.entries?.length) return

  const idToUid = new Map<ID, UID>(
    lineup.entries.map((e) => [
      'track_id' in e ? e.track_id : (e as { playlist_id: ID }).playlist_id,
      e.uid
    ])
  )
  const orderedUids = trackIdsInOrder
    .map((id) => idToUid.get(id))
    .filter((uid): uid is UID => !!uid)
  if (orderedUids.length === trackIdsInOrder.length) {
    yield* put(collectionPageLineupActions.updateLineupOrder(orderedUids))
  }
}
