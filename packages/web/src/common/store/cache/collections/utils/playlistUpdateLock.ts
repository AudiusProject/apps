import { Kind, ID } from '@audius/common/models'
import { confirmerSelectors } from '@audius/common/store'
import { makeKindId } from '@audius/common/utils'
import { call, select } from 'typed-redux-saga'

const { getConfirmLength } = confirmerSelectors

/** UID used by the confirmer for playlist updates. */
const getCollectionConfirmerUid = (playlistId: ID) =>
  makeKindId(Kind.COLLECTIONS, playlistId)

/**
 * Returns true if there are pending confirmer calls for this playlist.
 * When true, we should use cached data instead of refetching, since the cache
 * has been optimistically updated by preceding operations in this tab.
 */
export function* hasPendingPlaylistUpdates(playlistId: ID) {
  const uid = getCollectionConfirmerUid(playlistId)
  const length: number = yield* select(getConfirmLength, { uid })
  return length > 0
}

type LockEntry = {
  nextWaiterResolve: (() => void) | null
}

const lockEntries = new Map<ID, LockEntry>()

/**
 * Acquires a per-playlist mutex. Waits for any prior update to register with
 * the confirmer (which happens before release). Call release() after putting
 * requestConfirmation so the next update sees pending=true and uses cache.
 */
export function* acquirePlaylistUpdateLock(playlistId: ID) {
  const existing = lockEntries.get(playlistId)
  if (existing) {
    const waitPromise = new Promise<void>((resolve) => {
      existing.nextWaiterResolve = resolve
    })
    yield* call(() => waitPromise)
  }

  const release = () => {
    const entry = lockEntries.get(playlistId)
    lockEntries.delete(playlistId)
    entry?.nextWaiterResolve?.()
  }

  lockEntries.set(playlistId, { nextWaiterResolve: null })
  return release
}
