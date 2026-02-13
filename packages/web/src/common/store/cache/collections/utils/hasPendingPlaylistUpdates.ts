import { Kind, ID } from '@audius/common/models'
import { confirmerSelectors } from '@audius/common/store'
import { makeKindId } from '@audius/common/utils'
import { select } from 'typed-redux-saga'

const { getIsDone } = confirmerSelectors

/** UID used by the confirmer for playlist updates. */
export const getCollectionConfirmerUid = (playlistId: ID) =>
  makeKindId(Kind.COLLECTIONS, playlistId)

/**
 * Returns true if there are incomplete confirmer calls for this playlist.
 * When true, we should use cached data instead of refetching, since the cache
 * has been optimistically updated by preceding operations. Refetching could
 * return stale data before the write has propagated to the API.
 * When false (all calls have completed), we should refetch to get latest from
 * other tabs/sessions before making our update.
 */
export function* hasPendingPlaylistUpdates(playlistId: ID) {
  const uid = getCollectionConfirmerUid(playlistId)
  const done: boolean = yield* select(getIsDone, { uid })
  return !done
}

/**
 * Returns true when all confirmer calls for this playlist have completed.
 * Use before overwriting cache in success callbacks - only update when done
 * so we don't overwrite another operation's optimistic state.
 */
export function* isPlaylistConfirmerDone(playlistId: ID) {
  const uid = getCollectionConfirmerUid(playlistId)
  return yield* select(getIsDone, { uid })
}
