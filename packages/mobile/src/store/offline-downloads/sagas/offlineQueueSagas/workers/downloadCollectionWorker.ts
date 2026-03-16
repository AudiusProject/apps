import {
  transformAndCleanList,
  userCollectionMetadataFromSDK
} from '@audius/common/adapters'
import { queryCurrentUserId } from '@audius/common/api'
import type {
  CollectionMetadata,
  UserCollectionMetadata
} from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { getSDK } from '@audius/common/store'
import { Id, OptionalId } from '@audius/sdk/services'
import ReactNativeBlobUtil from 'react-native-blob-util'
import { select, call, put, take, race, all } from 'typed-redux-saga'

import { make, track } from 'app/services/analytics'
import {
  getCollectionCoverArtPath,
  getLocalCollectionDir,
  getLocalCollectionJsonPath,
  mkdirSafe
} from 'app/services/offline-downloader'
import { DOWNLOAD_REASON_FAVORITES } from 'app/store/offline-downloads/constants'
import { EventNames } from 'app/types/analytics'

import { getCollectionOfflineDownloadStatus } from '../../../selectors'
import type { CollectionId, OfflineJob } from '../../../slice'
import {
  abandonJob,
  errorJob,
  OfflineDownloadStatus,
  cancelJob,
  removeOfflineItems,
  completeJob,
  requestProcessNextJob,
  startJob
} from '../../../slice'
import { isCollectionDownloadable } from '../../utils/isCollectionDownloadable'
import { retryOfflineJob } from '../../utils/retryOfflineJob'
import { shouldAbortJob } from '../../utils/shouldAbortJob'
import { shouldCancelJob } from '../../utils/shouldCancelJob'

import { downloadFile } from './downloadFile'

const MAX_RETRY_COUNT = 3

function* shouldAbortDownload(collectionId: CollectionId) {
  while (true) {
    yield* take(removeOfflineItems.type)
    const trackStatus = yield* select(
      getCollectionOfflineDownloadStatus(collectionId)
    )
    if (!trackStatus) return true
  }
}

export function* downloadCollectionWorker(collectionId: CollectionId) {
  const queueItem: OfflineJob = { type: 'collection', id: collectionId }
  track(
    make({ eventName: EventNames.OFFLINE_MODE_DOWNLOAD_START, ...queueItem })
  )
  yield* put(startJob(queueItem))

  const { jobResult, cancel, abortDownload, abortJob } = yield* race({
    jobResult: retryOfflineJob(
      MAX_RETRY_COUNT,
      1000,
      downloadCollectionAsync,
      collectionId
    ),
    abortDownload: call(shouldAbortDownload, collectionId),
    abortJob: call(shouldAbortJob),
    cancel: call(shouldCancelJob)
  })

  if (abortDownload || abortJob) {
    yield* call(removeDownloadedCollection, collectionId)
    yield* put(requestProcessNextJob())
  } else if (cancel) {
    yield* put(cancelJob(queueItem))
    yield* call(removeDownloadedCollection, collectionId)
  } else if (jobResult === OfflineDownloadStatus.ERROR) {
    track(
      make({
        eventName: EventNames.OFFLINE_MODE_DOWNLOAD_FAILURE,
        ...queueItem
      })
    )
    yield* put(errorJob(queueItem))
    yield* call(removeDownloadedCollection, collectionId)
    yield* put(requestProcessNextJob())
  } else if (jobResult === OfflineDownloadStatus.ABANDONED) {
    track(
      make({
        eventName: EventNames.OFFLINE_MODE_DOWNLOAD_FAILURE,
        ...queueItem
      })
    )
    yield* put(abandonJob(queueItem))
    yield* call(removeDownloadedCollection, collectionId)
    yield* put(requestProcessNextJob())
  } else if (jobResult === OfflineDownloadStatus.SUCCESS) {
    track(
      make({
        eventName: EventNames.OFFLINE_MODE_DOWNLOAD_SUCCESS,
        ...queueItem
      })
    )
    yield* put(completeJob(queueItem))
    yield* put(requestProcessNextJob())
  }
}

function* downloadCollectionAsync(
  collectionId: CollectionId
): Generator<any, OfflineDownloadStatus> {
  if (collectionId === DOWNLOAD_REASON_FAVORITES) {
    yield* call(writeFavoritesCollectionMetadata)
    return OfflineDownloadStatus.SUCCESS
  }

  const currentUserId = yield* call(queryCurrentUserId)
  if (!currentUserId) return OfflineDownloadStatus.ERROR

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

  if (!collection) return OfflineDownloadStatus.ERROR

  if (!isCollectionDownloadable(collection, currentUserId)) {
    return OfflineDownloadStatus.ABANDONED
  }

  try {
    yield* all([
      call(downloadCollectionCoverArt, collection),
      call(writeCollectionMetadata, collection)
    ])
  } catch (e) {
    return OfflineDownloadStatus.ERROR
  }

  return OfflineDownloadStatus.SUCCESS
}

function* downloadCollectionCoverArt(collection: CollectionMetadata) {
  const { artwork, playlist_id } = collection

  const primaryImage = artwork[SquareSizes.SIZE_1000_BY_1000]
  if (!primaryImage) return

  const coverArtUris = [
    primaryImage,
    ...(artwork.mirrors ?? []).map((mirror) => {
      const url = new URL(primaryImage)
      url.hostname = new URL(mirror).hostname
      return url.toString()
    })
  ]

  const covertArtFilePath = getCollectionCoverArtPath(playlist_id)

  for (const coverArtUri of coverArtUris) {
    const response = yield* call(downloadFile, coverArtUri, covertArtFilePath)
    const { status } = response.info()
    if (status === 200) return
  }
}

// Special case for favorites which is not a real collection with metadata
async function writeFavoritesCollectionMetadata() {
  const favoritesCollectionDirectory = getLocalCollectionDir(
    DOWNLOAD_REASON_FAVORITES
  )
  return await mkdirSafe(favoritesCollectionDirectory)
}

async function writeCollectionMetadata(collection: UserCollectionMetadata) {
  const { playlist_id } = collection
  const collectionMetadataPath = getLocalCollectionJsonPath(
    playlist_id.toString()
  )
  return await ReactNativeBlobUtil.fs.writeFile(
    collectionMetadataPath,
    JSON.stringify(collection)
  )
}

async function removeDownloadedCollection(collectionId: CollectionId) {
  const collectionDir = getLocalCollectionDir(collectionId.toString())
  const exists = await ReactNativeBlobUtil.fs.exists(collectionDir)
  if (!exists) return
  return await ReactNativeBlobUtil.fs.unlink(collectionDir)
}
