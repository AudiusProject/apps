import type { CommonState } from '@audius/common/store'
import { waitForBackendSetup } from '@audius/web/src/common/store/backend/sagas'
import { waitForRead } from '@audius/web/src/utils/sagaHelpers'
import { difference, intersection } from 'lodash'
import { put, select, take } from 'typed-redux-saga'

import { DOWNLOAD_REASON_FAVORITES } from 'app/store/offline-downloads/constants'

import { getOfflineCollectionsStatus } from '../selectors'
import type { CollectionId, OfflineEntry } from '../slice'
import {
  doneLoadingFromDisk,
  addOfflineEntries,
  removeOfflineItems
} from '../slice'

import { getStaleTracks } from './getStaleTracks'

export function* syncOfflineDataSaga() {
  yield* take(doneLoadingFromDisk.type)
  yield* waitForRead()
  yield* waitForBackendSetup()

  const accountCollections = yield* select(
    (state: CommonState) => state.account.collections
  )
  const collectionStatus = yield* select(getOfflineCollectionsStatus)

  const offlineCollectionIds = Object.keys(collectionStatus)
    .filter((id) => id !== DOWNLOAD_REASON_FAVORITES)
    .map((id) => parseInt(id, 10))

  const accountCollectionIds = Object.keys(accountCollections).map((id) =>
    parseInt(id, 10)
  )

  const collectionIdsToRemove = difference(
    offlineCollectionIds,
    accountCollectionIds
  )

  if (collectionIdsToRemove.length > 0) {
    yield* put(
      removeOfflineItems({
        items: collectionIdsToRemove.map((id) => ({
          type: 'collection',
          id,
          metadata: {
            reasons_for_download: [
              { is_from_favorites: true },
              { is_from_favorites: false }
            ]
          }
        }))
      })
    )
  }

  const offlineItemsToAdd: OfflineEntry[] = []

  const collectionIdsToSync: CollectionId[] = intersection(
    offlineCollectionIds,
    accountCollectionIds
  )

  if (collectionStatus[DOWNLOAD_REASON_FAVORITES]) {
    collectionIdsToSync.unshift(DOWNLOAD_REASON_FAVORITES)
  }

  const collectionsToSync: OfflineEntry[] = collectionIdsToSync.map((id) => ({
    type: 'collection-sync',
    id
  }))

  offlineItemsToAdd.push(...collectionsToSync)

  if (collectionStatus[DOWNLOAD_REASON_FAVORITES]) {
    const collectionIdsToAdd = difference(
      accountCollectionIds,
      offlineCollectionIds
    )

    const collectionsToAdd: OfflineEntry[] = collectionIdsToAdd.map((id) => ({
      type: 'collection',
      id,
      metadata: { reasons_for_download: [{ is_from_favorites: true }] }
    }))

    offlineItemsToAdd.push(...collectionsToAdd)
  }

  const staleTracks = yield* getStaleTracks()

  offlineItemsToAdd.push(...staleTracks)

  if (offlineItemsToAdd.length > 0) {
    yield* put(addOfflineEntries({ items: offlineItemsToAdd }))
  }
}
