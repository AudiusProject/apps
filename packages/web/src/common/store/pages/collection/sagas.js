import { queryCollection, queryCollectionByPermalink } from '@audius/common/api'
import { Kind } from '@audius/common/models'
import {
  cacheActions,
  collectionPageActions as collectionActions,
  reachabilitySelectors
} from '@audius/common/store'
import { makeUid, route } from '@audius/common/utils'
import { call, put, select, takeLatest } from 'redux-saga/effects'

import { push as pushRoute } from 'utils/navigation'

const { NOT_FOUND_PAGE } = route
const { fetchCollectionSucceeded, fetchCollectionFailed } = collectionActions
const { getIsReachable } = reachabilitySelectors

function* watchFetchCollection() {
  yield takeLatest(collectionActions.FETCH_COLLECTION, function* (action) {
    const { id: collectionId, permalink, forceFetch } = action
    const queryOptions = forceFetch ? { force: true, staleTime: 0 } : undefined

    let collection
    if (permalink) {
      collection = yield call(
        queryCollectionByPermalink,
        permalink,
        queryOptions
      )
    } else {
      collection = yield call(queryCollection, collectionId, queryOptions)
    }

    const isReachable = yield select(getIsReachable)
    if (!collection && isReachable) {
      yield put(pushRoute(NOT_FOUND_PAGE))
      return
    }
    const userUid = makeUid(Kind.USERS, collection.playlist_owner_id)
    if (collection) {
      yield put(
        cacheActions.subscribe(Kind.USERS, [
          { uid: userUid, id: collection.playlist_owner_id }
        ])
      )
      yield put(
        fetchCollectionSucceeded(
          collection.playlist_id,
          collection.permalink,
          userUid,
          collection.playlist_contents.track_ids.length
        )
      )
    } else {
      yield put(fetchCollectionFailed(userUid))
    }
  })
}

export default function sagas() {
  return [watchFetchCollection]
}
