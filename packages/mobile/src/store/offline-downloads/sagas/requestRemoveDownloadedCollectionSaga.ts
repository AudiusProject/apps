import { takeEvery, select, put } from 'typed-redux-saga'

import { getOfflineTrackMetadata } from '../selectors'
import type { CollectionAction, OfflineEntry } from '../slice'
import { removeOfflineItems, requestRemoveDownloadedCollection } from '../slice'

export function* requestRemoveDownloadedCollectionSaga() {
  yield* takeEvery(
    requestRemoveDownloadedCollection.type,
    removeDownloadedCollectionWorker
  )
}

function* removeDownloadedCollectionWorker(action: CollectionAction) {
  const { collectionId } = action.payload
  const offlineItemsToRemove: OfflineEntry[] = []

  offlineItemsToRemove.push({
    type: 'collection',
    id: collectionId,
    metadata: { reasons_for_download: [{ is_from_favorites: false }] }
  })

  const offlineTrackMetadata = yield* select(getOfflineTrackMetadata)
  const offlineTrackIds = Object.keys(offlineTrackMetadata).map((id) =>
    parseInt(id, 10)
  )

  for (const offlineTrackId of offlineTrackIds) {
    offlineItemsToRemove.push({
      type: 'track',
      id: offlineTrackId,
      metadata: {
        reasons_for_download: [
          { collection_id: collectionId, is_from_favorites: false }
        ]
      }
    })
  }

  yield* put(removeOfflineItems({ items: offlineItemsToRemove }))
}
