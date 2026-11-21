import { queryCollections, queryCurrentAccount } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { savedCollectionsActions, CollectionType } from '@audius/common/store'
import { waitForRead } from '@audius/common/utils'
import { all, call, put, takeEvery } from 'typed-redux-saga'

import { FETCH_ACCOUNT_COLLECTIONS } from './actions'

const { fetchCollections, fetchCollectionsSucceeded } = savedCollectionsActions

type FetchCollectionsConfig = {
  type: CollectionType
  ids: ID[]
}

function* fetchCollectionsAsync({ ids, type }: FetchCollectionsConfig) {
  yield waitForRead()
  yield* call(queryCollections, ids)

  yield* put(
    fetchCollectionsSucceeded({
      type
    })
  )
}

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
