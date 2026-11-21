import {
  primeCollectionDataSaga,
  primeTrackDataSaga,
  primeUserDataSaga
} from '@audius/common/api'
import type {
  CollectionMetadata,
  ID,
  UID,
  TrackMetadata,
  UserMetadata
} from '@audius/common/models'
import { Kind } from '@audius/common/models'
import { makeUid } from '@audius/common/utils'
import { call, select, put } from 'typed-redux-saga'

import {
  getCollectionJson,
  getTrackJson
} from 'app/services/offline-downloader'

import { DOWNLOAD_REASON_FAVORITES } from '../constants'
import {
  getOfflineCollectionsStatus,
  getOfflineTrackStatus
} from '../selectors'
import type { OfflineJob } from '../slice'
import {
  redownloadOfflineItems,
  doneLoadingFromDisk,
  OfflineDownloadStatus
} from '../slice'

import { migrateOfflineDataPathSaga } from './migrateOfflineDataPathSaga'

type CachedCollection = CollectionMetadata
type CachedUser = { id: ID; uid: UID; metadata: UserMetadata }
type CachedTrack = TrackMetadata

const READ_CONCURRENCY = 8

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(READ_CONCURRENCY, items.length) }, worker)
  )
  return results
}

export function* rehydrateOfflineDataSaga() {
  yield* migrateOfflineDataPathSaga()

  const collectionsToCache: CachedCollection[] = []
  const usersToCache: CachedUser[] = []
  const tracksToCache: CachedTrack[] = []
  const collectionsToRedownload: OfflineJob[] = []
  const tracksToRedownload: OfflineJob[] = []

  const offlineCollectionStatus = yield* select(getOfflineCollectionsStatus)
  const downloadedCollectionIds = Object.keys(offlineCollectionStatus).filter(
    (collectionId) =>
      offlineCollectionStatus[collectionId] === OfflineDownloadStatus.SUCCESS &&
      collectionId !== DOWNLOAD_REASON_FAVORITES
  )
  const userCollections = yield* call(() =>
    mapWithConcurrency(downloadedCollectionIds, getCollectionJson)
  )

  for (let i = 0; i < downloadedCollectionIds.length; i++) {
    const collectionId = downloadedCollectionIds[i]
    const userCollection = userCollections[i]
    if (userCollection === null) {
      collectionsToRedownload.push({
        type: 'collection',
        id: Number(collectionId)
      })
      continue
    }

    const { user, ...collection } = userCollection

    collectionsToCache.push({ ...collection, local: true })

    if (user) {
      const { user_id } = user
      usersToCache.push({
        id: user_id,
        uid: makeUid(Kind.USERS, user_id),
        metadata: { ...user, local: true }
      })
    }
  }

  const offlineTrackStatus = yield* select(getOfflineTrackStatus)
  const downloadedTrackIds = Object.keys(offlineTrackStatus).filter(
    (id) => offlineTrackStatus[id] === OfflineDownloadStatus.SUCCESS
  )

  const userTracks = yield* call(() =>
    mapWithConcurrency(downloadedTrackIds, getTrackJson)
  )

  for (let i = 0; i < downloadedTrackIds.length; i++) {
    const trackId = downloadedTrackIds[i]
    const userTrack = userTracks[i]
    if (userTrack === null) {
      tracksToRedownload.push({
        type: 'track',
        id: Number(trackId)
      })
      continue
    }

    const { user, ...track } = userTrack

    tracksToCache.push({ ...track, local: true })

    if (user) {
      const { user_id } = user
      usersToCache.push({
        id: user_id,
        uid: makeUid(Kind.USERS, user_id),
        metadata: { ...user, local: true }
      })
    }
  }

  if (collectionsToRedownload.length > 0 || tracksToRedownload.length > 0) {
    yield* put(
      redownloadOfflineItems({
        items: [...collectionsToRedownload, ...tracksToRedownload]
      })
    )
  }

  if (collectionsToCache.length > 0) {
    yield* call(primeCollectionDataSaga, collectionsToCache)
  }

  if (tracksToCache.length > 0) {
    yield* call(primeTrackDataSaga, tracksToCache)
  }

  if (usersToCache.length > 0) {
    yield* call(
      primeUserDataSaga,
      usersToCache.map((user) => user.metadata)
    )
  }

  yield* put(doneLoadingFromDisk())
}
