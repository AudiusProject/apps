import {
  transformAndCleanList,
  userCollectionMetadataFromSDK
} from '@audius/common/adapters'
import { queryCurrentUserId } from '@audius/common/api'
import { FavoriteSource } from '@audius/common/models'
import { collectionsSocialActions, getSDK } from '@audius/common/store'
import { Id, OptionalId } from '@audius/sdk/services'
import { takeEvery, put, call } from 'typed-redux-saga'

import { make, track } from 'app/services/analytics'
import { EventNames } from 'app/types/analytics'

import type { CollectionAction, OfflineEntry } from '../slice'
import { addOfflineEntries, requestDownloadCollection } from '../slice'

const { saveCollection } = collectionsSocialActions

export function* requestDownloadCollectionSaga() {
  yield* takeEvery(requestDownloadCollection.type, downloadCollection)
}

function* downloadCollection(action: CollectionAction) {
  const { collectionId } = action.payload
  track(
    make({
      eventName: EventNames.OFFLINE_MODE_DOWNLOAD_COLLECTION_TOGGLE_ON,
      collectionId
    })
  )

  const currentUserId = yield* call(queryCurrentUserId)
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

  const { playlist_owner_id, has_current_user_saved } = collection

  const shouldSaveCollection =
    playlist_owner_id !== currentUserId && !has_current_user_saved

  if (shouldSaveCollection) {
    yield* put(saveCollection(collectionId, FavoriteSource.OFFLINE_DOWNLOAD))
  }

  const offlineItemsToAdd: OfflineEntry[] = []

  offlineItemsToAdd.push({
    type: 'collection',
    id: collectionId,
    metadata: { reasons_for_download: [{ is_from_favorites: false }] }
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
          { collection_id: collectionId, is_from_favorites: false }
        ]
      }
    })
  }

  yield* put(addOfflineEntries({ items: offlineItemsToAdd }))
}
