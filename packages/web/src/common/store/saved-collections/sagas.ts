import { queryCurrentAccount } from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  savedCollectionsActions,
  CollectionType,
  accountSelectors
} from '@audius/common/store'
import { waitForRead } from '@audius/common/utils'
import { all, call, select, put, takeEvery } from 'typed-redux-saga'

import { retrieveCollections } from '../cache/collections/utils'

import { FETCH_ACCOUNT_COLLECTIONS } from './actions'

const { fetchCollections, fetchCollectionsSucceeded } = savedCollectionsActions

type FetchCollectionsConfig = {
  type: CollectionType
  ids: ID[]
}

function* fetchCollectionsAsync({ ids, type }: FetchCollectionsConfig) {
  yield waitForRead()
  const userId = yield* select(accountSelectors.getUserId)
  yield* call(retrieveCollections, ids, { userId })

  yield* put(
    fetchCollectionsSucceeded({
      type
    })
  )
}

/** Will create and wait on parallel effects to fetch full details for all saved albums and
 * playlists. Note: Only use this if you really need full details (such as track
 * lists) for all collections, as it may potentially fetch a lot of data.
 */
export function* fetchAllAccountCollections() {
  yield waitForRead()

  const account = yield* queryCurrentAccount()
  if (!account) return
  const collections = account.collections ?? {}
  const playlists = Object.values(collections).filter((c) => !c.is_album)
  const albums = Object.values(collections).filter((c) => c.is_album)

  yield* all([
    call(fetchCollectionsAsync, {
      ids: albums.map(({ id }) => id),
      type: 'albums'
    }),
    call(fetchCollectionsAsync, {
      ids: playlists.map(({ id }) => id),
      type: 'playlists'
    })
  ])
}

function* watchFetchAccountCollections() {
  yield* takeEvery(FETCH_ACCOUNT_COLLECTIONS, fetchAllAccountCollections)
}

function* watchFetchCollections() {
  yield* takeEvery(
    fetchCollections.type,
    function* (action: ReturnType<typeof fetchCollections>) {
      yield* fetchCollectionsAsync(action.payload)
    }
  )
}

export default function sagas() {
  return [watchFetchAccountCollections, watchFetchCollections]
}
