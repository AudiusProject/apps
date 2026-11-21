import { Kind, ID } from '@audius/common/models'
import { confirmerSelectors } from '@audius/common/store'
import { makeKindId } from '@audius/common/utils'
import { select } from 'typed-redux-saga'

const { getIsDone } = confirmerSelectors

export const getCollectionConfirmerUid = (playlistId: ID) =>
  makeKindId(Kind.COLLECTIONS, playlistId)

export function* hasPendingPlaylistUpdates(playlistId: ID) {
  const uid = getCollectionConfirmerUid(playlistId)
  const done: boolean = yield* select(getIsDone, { uid })
  return !done
}

export function* isPlaylistConfirmerDone(playlistId: ID) {
  const uid = getCollectionConfirmerUid(playlistId)
  return yield* select(getIsDone, { uid })
}
