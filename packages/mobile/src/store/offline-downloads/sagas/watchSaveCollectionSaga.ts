import { FavoriteSource } from '@audius/common/models'
import { collectionsSocialActions } from '@audius/common/store'
import { takeEvery, select, put } from 'typed-redux-saga'

import { getIsFavoritesDownloadsEnabled } from '../selectors'
import { requestDownloadFavoritedCollection } from '../slice'

const { saveCollection, SAVE_COLLECTION } = collectionsSocialActions

export function* watchSaveCollectionSaga() {
  yield* takeEvery(SAVE_COLLECTION, checkIfShouldDownload)
}

function* checkIfShouldDownload(action: ReturnType<typeof saveCollection>) {
  const { collectionId, source } = action
  const isFavoritesDownloadEnabled = yield* select(
    getIsFavoritesDownloadsEnabled
  )
  if (
    isFavoritesDownloadEnabled &&
    source !== FavoriteSource.OFFLINE_DOWNLOAD
  ) {
    yield* put(requestDownloadFavoritedCollection({ collectionId }))
  }
}
