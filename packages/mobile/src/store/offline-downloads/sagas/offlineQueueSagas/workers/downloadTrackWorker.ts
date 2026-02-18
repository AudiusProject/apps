import { userTrackMetadataFromSDK } from '@audius/common/adapters'
import { queryCurrentUserId } from '@audius/common/api'
import type {
  ID,
  TrackMetadata,
  UserTrackMetadata
} from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { getContext, gatedContentSelectors, getSDK } from '@audius/common/store'
import { Id, OptionalId } from '@audius/sdk'
import ReactNativeBlobUtil from 'react-native-blob-util'
import { select, call, put, all, take, race } from 'typed-redux-saga'

import { make, track } from 'app/services/analytics'
import {
  getLocalAudioPath,
  getLocalTrackCoverArtDestination,
  getLocalTrackDir,
  getLocalTrackJsonPath
} from 'app/services/offline-downloader'
import { EventNames } from 'app/types/analytics'

import { getTrackOfflineDownloadStatus } from '../../../selectors'
import type { OfflineJob } from '../../../slice'
import {
  cancelJob,
  completeJob,
  requestProcessNextJob,
  errorJob,
  OfflineDownloadStatus,
  removeOfflineItems,
  startJob,
  abandonJob
} from '../../../slice'
import { isTrackDownloadable } from '../../utils/isTrackDownloadable'
import { retryOfflineJob } from '../../utils/retryOfflineJob'
import { shouldAbortJob } from '../../utils/shouldAbortJob'
import { shouldCancelJob } from '../../utils/shouldCancelJob'

import { downloadFile } from './downloadFile'

const { getNftAccessSignatureMap } = gatedContentSelectors

const MAX_RETRY_COUNT = 3
const MAX_REQUEUE_COUNT = 3

function* shouldAbortDownload(trackId: ID) {
  while (true) {
    yield* take(removeOfflineItems.type)
    const trackStatus = yield* select(getTrackOfflineDownloadStatus(trackId))
    if (!trackStatus) return true
  }
}

export function* downloadTrackWorker(trackId: ID, requeueCount?: number) {
  const queueItem: OfflineJob = { type: 'track', id: trackId, requeueCount }
  track(
    make({ eventName: EventNames.OFFLINE_MODE_DOWNLOAD_START, ...queueItem })
  )
  yield* put(startJob(queueItem))

  const { jobResult, cancel, abortDownload, abortJob } = yield* race({
    jobResult: retryOfflineJob(
      MAX_RETRY_COUNT,
      1000,
      downloadTrackAsync,
      trackId
    ),
    abortDownload: call(shouldAbortDownload, trackId),
    abortJob: call(shouldAbortJob),
    cancel: call(shouldCancelJob)
  })

  if (abortDownload || abortJob) {
    yield* call(removeDownloadedTrack, trackId)
    yield* put(requestProcessNextJob())
  } else if (cancel) {
    yield* call(removeDownloadedTrack, trackId)
    yield* put(cancelJob(queueItem))
  } else if (jobResult === OfflineDownloadStatus.ERROR) {
    track(
      make({
        eventName: EventNames.OFFLINE_MODE_DOWNLOAD_FAILURE,
        ...queueItem
      })
    )
    yield* call(removeDownloadedTrack, trackId)
    if ((requeueCount ?? 0) < MAX_REQUEUE_COUNT - 1) {
      yield* put(errorJob(queueItem))
    } else {
      yield* put(abandonJob(queueItem))
    }
    yield* put(requestProcessNextJob())
  } else if (jobResult === OfflineDownloadStatus.ABANDONED) {
    track(
      make({
        eventName: EventNames.OFFLINE_MODE_DOWNLOAD_FAILURE,
        ...queueItem
      })
    )
    yield* put(abandonJob(queueItem))
    yield* call(removeDownloadedTrack, trackId)
    yield* put(requestProcessNextJob())
  } else if (jobResult === OfflineDownloadStatus.SUCCESS) {
    track(
      make({
        eventName: EventNames.OFFLINE_MODE_DOWNLOAD_SUCCESS,
        ...queueItem
      })
    )
    yield* put(completeJob({ ...queueItem, completedAt: Date.now() }))
    yield* put(requestProcessNextJob())
  }
}

function* downloadTrackAsync(
  trackId: ID
): Generator<any, OfflineDownloadStatus> {
  const currentUserId = yield* call(queryCurrentUserId)
  if (!currentUserId) return OfflineDownloadStatus.ERROR
  const sdk = yield* getSDK()

  const { data } = yield* call([sdk.full.tracks, sdk.full.tracks.getTrack], {
    trackId: Id.parse(trackId),
    userId: OptionalId.parse(currentUserId)
  })
  const track = data ? userTrackMetadataFromSDK(data) : null

  if (!track) return OfflineDownloadStatus.ERROR

  if (!isTrackDownloadable(track, currentUserId)) {
    return OfflineDownloadStatus.ABANDONED
  }

  try {
    yield* all([
      call(downloadTrackCoverArt, track),
      call(downloadTrackAudio, track, currentUserId),
      call(writeTrackMetadata, track)
    ])
  } catch (e) {
    return OfflineDownloadStatus.ERROR
  }

  return OfflineDownloadStatus.SUCCESS
}

function* downloadTrackAudio(track: UserTrackMetadata, userId: ID) {
  const { track_id } = track

  const trackFilePath = getLocalAudioPath(track_id)

  const audiusSdk = yield* getContext('audiusSdk')
  const sdk = yield* call(audiusSdk)
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const nftAccessSignatureMap = yield* select(getNftAccessSignatureMap)
  const nftAccessSignature = nftAccessSignatureMap[track_id]?.mp3 ?? null
  const { data, signature } = yield* call(
    audiusBackendInstance.signGatedContentRequest,
    { sdk }
  )
  const trackAudioUri = yield* call(
    [sdk.tracks, sdk.tracks.getTrackStreamUrl],
    {
      trackId: Id.parse(track_id),
      userId: OptionalId.parse(userId),
      userSignature: signature,
      userData: data,
      nftAccessSignature: nftAccessSignature
        ? JSON.stringify(nftAccessSignature)
        : undefined
    }
  )
  const response = yield* call(downloadFile, trackAudioUri, trackFilePath)
  const { status } = response.info()
  if (status === 200) return

  throw new Error('Unable to download track audio')
}

function* downloadTrackCoverArt(track: TrackMetadata) {
  const { artwork, track_id } = track

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

  const covertArtFilePath = getLocalTrackCoverArtDestination(track_id)

  for (const coverArtUri of coverArtUris) {
    const response = yield* call(downloadFile, coverArtUri, covertArtFilePath)
    const { status } = response.info()
    if (status === 200) return
  }

  throw new Error('Unable to download track cover art')
}

async function writeTrackMetadata(track: UserTrackMetadata) {
  const { track_id } = track

  const trackMetadataPath = getLocalTrackJsonPath(track_id.toString())

  return await ReactNativeBlobUtil.fs.writeFile(
    trackMetadataPath,
    JSON.stringify(track)
  )
}

async function removeDownloadedTrack(trackId: ID) {
  const trackDirectory = getLocalTrackDir(trackId.toString())
  const exists = await ReactNativeBlobUtil.fs.exists(trackDirectory)
  if (!exists) return
  return await ReactNativeBlobUtil.fs.unlink(trackDirectory)
}
