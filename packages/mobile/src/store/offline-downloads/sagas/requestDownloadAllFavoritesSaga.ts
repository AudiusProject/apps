import { transformAndCleanList, favoriteFromSDK } from '@audius/common/adapters'
import {
  queryCollections,
  queryCurrentAccount,
  queryCurrentUserId
} from '@audius/common/api'
import { libraryPageSelectors, getSDK } from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import { Id } from '@audius/sdk/services'
import { fetchAllAccountCollections } from 'common/store/saved-collections/sagas'
import { takeEvery, select, call, put } from 'typed-redux-saga'

import { make, track } from 'app/services/analytics'
import { DOWNLOAD_REASON_FAVORITES } from 'app/store/offline-downloads/constants'
import { EventNames } from 'app/types/analytics'

import type { OfflineEntry } from '../slice'
import { addOfflineEntries, requestDownloadAllFavorites } from '../slice'

const { getLocalTrackFavorites } = libraryPageSelectors

export function* requestDownloadAllFavoritesSaga() {
  yield* takeEvery(requestDownloadAllFavorites.type, downloadAllFavorites)
}

function* downloadAllFavorites() {
  track(make({ eventName: EventNames.OFFLINE_MODE_DOWNLOAD_ALL_TOGGLE_ON }))
  const currentUserId = yield* call(queryCurrentUserId)
  if (!currentUserId) return

  const offlineItemsToAdd: OfflineEntry[] = []

  offlineItemsToAdd.push({
    type: 'collection',
    id: DOWNLOAD_REASON_FAVORITES,
    metadata: { reasons_for_download: [{ is_from_favorites: true }] }
  })

  const trackReasonsForDownload = [
    { is_from_favorites: true, collection_id: DOWNLOAD_REASON_FAVORITES }
  ]

  // Add local saves
  const favorite_created_at = dayjs().format('YYYY-MM-DD HH:mm:ss')
  const localSaves = yield* select(getLocalTrackFavorites)
  const localSavesToAdd: OfflineEntry[] = Object.keys(localSaves)
    .map((id) => parseInt(id, 10))
    .map((id) => ({
      type: 'track',
      id,
      metadata: {
        favorite_created_at,
        reasons_for_download: trackReasonsForDownload
      }
    }))

  offlineItemsToAdd.push(...localSavesToAdd)

  // Add favorited tracks from api
  const sdk = yield* getSDK()

  const { data } = (yield* call([sdk.users, sdk.users.getUserFavorites], {
    id: Id.parse(currentUserId)
  })) as import('@audius/sdk').FavoritesResponse
  const allFavoritedTracks = transformAndCleanList(data, favoriteFromSDK)

  if (allFavoritedTracks) {
    for (const favoritedTrack of allFavoritedTracks) {
      const { save_item_id: trackId, created_at } = favoritedTrack

      offlineItemsToAdd.push({
        type: 'track',
        id: trackId,
        metadata: {
          favorite_created_at: created_at,
          reasons_for_download: trackReasonsForDownload
        }
      })
    }
  }

  // Add favorited collections and their tracks
  // AccountCollections don't include track lists, so retrieve all the collections
  // first
  yield* call(fetchAllAccountCollections)
  const account = yield* queryCurrentAccount()
  const accountCollectionsMap = account?.collections ?? {}
  const accountCollectionsArr = Object.values(accountCollectionsMap)
  const favoritedAlbums = accountCollectionsArr.filter((c) => c.is_album)
  const collectionsMap = yield* queryCollections(
    accountCollectionsArr.map((c) => c.id)
  )
  const collections = Object.values(collectionsMap)

  for (const favoritedCollection of favoritedAlbums) {
    const { id } = favoritedCollection
    const downloadReason = { is_from_favorites: true }

    offlineItemsToAdd.push({
      type: 'collection',
      id,
      metadata: {
        reasons_for_download: [downloadReason]
      }
    })
  }

  for (const collection of collections) {
    const {
      playlist_id,
      playlist_contents: { track_ids }
    } = collection

    for (const { track: trackId } of track_ids) {
      const downloadReason = {
        is_from_favorites: true,
        collection_id: playlist_id
      }

      offlineItemsToAdd.push({
        type: 'track',
        id: trackId,
        metadata: { reasons_for_download: [downloadReason] }
      })
    }
  }

  yield* put(addOfflineEntries({ items: offlineItemsToAdd }))
}
