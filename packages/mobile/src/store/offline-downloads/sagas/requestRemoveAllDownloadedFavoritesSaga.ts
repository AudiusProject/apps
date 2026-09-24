import { takeEvery, select, put } from 'typed-redux-saga'

import { DOWNLOAD_REASON_FAVORITES } from 'app/store/offline-downloads/constants'

import {
  getOfflineCollectionMetadata,
  getOfflineTrackMetadata
} from '../selectors'
import type { OfflineEntry } from '../slice'
import {
  removeOfflineItems,
  requestRemoveAllDownloadedFavorites
} from '../slice'

/*
 * Saga initiated when user has requested to un-download their favorites.
 * This includes the "favorites" collection and all collections that were
 * not explicitly downloaded by the user previously.
 */
export function* requestRemoveAllDownloadedFavoritesSaga() {
  yield* takeEvery(
    requestRemoveAllDownloadedFavorites.type,
    removeAllDownloadedFavoritesWorker
  )
}

function* removeAllDownloadedFavoritesWorker() {
  const offlineItemsToRemove: OfflineEntry[] = []
  const offlineCollectionMetadata = yield* select(getOfflineCollectionMetadata)
  const offlineCollectionIds = Object.keys(offlineCollectionMetadata).map(
    (id) => (id === DOWNLOAD_REASON_FAVORITES ? id : parseInt(id, 10))
  )

  for (const collectionId of offlineCollectionIds) {
    offlineItemsToRemove.push({
      type: 'collection',
      id: collectionId,
      metadata: { reasons_for_download: [{ is_from_favorites: true }] }
    })
  }

  const offlineTrackMetadata = yield* select(getOfflineTrackMetadata)
  const offlineTrackIds = Object.keys(offlineTrackMetadata).map((id) =>
    parseInt(id, 10)
  )

  for (const offlineTrackId of offlineTrackIds) {
    const reasonsToRemove = offlineCollectionIds.map((collectionId) => ({
      collection_id: collectionId,
      is_from_favorites: true
    }))

    offlineItemsToRemove.push({
      type: 'track',
      id: offlineTrackId,
      metadata: { reasons_for_download: reasonsToRemove }
    })
  }

  yield* put(removeOfflineItems({ items: offlineItemsToRemove }))
}
