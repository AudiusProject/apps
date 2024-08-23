import {
  transformAndCleanList,
  userCollectionMetadataFromSDK
} from '@audius/common/adapters'
import { Id, OptionalId } from '@audius/common/models'
import { accountSelectors, getSDK } from '@audius/common/store'
import { takeEvery, select, put, call } from 'typed-redux-saga'

import type { CollectionAction, OfflineEntry } from '../slice'
import { addOfflineEntries, requestDownloadFavoritedCollection } from '../slice'

const { getUserId } = accountSelectors

export function* requestDownloadFavoritedCollectionSaga() {
  yield* takeEvery(
    requestDownloadFavoritedCollection.type,
    downloadFavoritedCollection
  )
}

function* downloadFavoritedCollection(action: CollectionAction) {
  const { collectionId } = action.payload

  const currentUserId = yield* select(getUserId)
  if (!currentUserId) return

  const sdk = yield* getSDK()

  const { data = [] } = yield* call(
    [sdk.playlists, sdk.playlists.getPlaylist],
    {
      playlistId: Id.parse(collectionId),
      userId: OptionalId.parse(currentUserId)
    }
  )
  const [collection] = transformAndCleanList(
    data,
    userCollectionMetadataFromSDK
  )

  if (!collection) return

  const offlineItemsToAdd: OfflineEntry[] = []

  offlineItemsToAdd.push({
    type: 'collection',
    id: collectionId,
    metadata: { reasons_for_download: [{ is_from_favorites: true }] }
  })

  const {
    playlist_contents: { track_ids }
  } = collection

  for (const { track: trackId } of track_ids) {
    offlineItemsToAdd.push({
      type: 'track',
      id: trackId,
      metadata: {
        reasons_for_download: [
          { collection_id: collectionId, is_from_favorites: true }
        ]
      }
    })
  }

  yield* put(addOfflineEntries({ items: offlineItemsToAdd }))
}
