import {
  albumMetadataForCreateWithSDK,
  fileToSdk,
  playlistMetadataForCreateWithSDK,
  stemTrackMetadataFromSDK,
  trackMetadataForUploadToSdk,
  transformAndCleanList,
  userCollectionMetadataFromSDK
} from '@audius/common/adapters'
import {
  getStemsQueryKey,
  queryAccountUser,
  queryCurrentUserId,
  queryTracks,
  queryUser,
  primeCollectionDataSaga,
  getUserQueryKey,
  QUERY_KEYS
} from '@audius/common/api'
import {
  Collection,
  Feature,
  FieldVisibility,
  ID,
  Name,
  StemTrack,
  StemUploadWithFile,
  isContentFollowGated,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import { CollectionValues } from '@audius/common/schemas'
import {
  TrackMetadataForUpload,
  LibraryCategory,
  ProgressStatus,
  TrackForUpload,
  UploadType,
  accountActions,
  confirmerActions,
  getContext,
  libraryPageActions,
  uploadActions,
  getSDK,
  cacheTracksActions,
  replaceTrackProgressModalActions,
  queueSelectors,
  queueActions,
  playerActions
} from '@audius/common/store'
import { actionChannelDispatcher, waitForAccount } from '@audius/common/utils'
import {
  Id,
  OptionalId,
  ProgressHandler,
  AudiusSdk,
  OptionalHashId
} from '@audius/sdk'
import { mapValues } from 'lodash'
import { Channel, Task, buffers, channel } from 'redux-saga'
import {
  all,
  call,
  cancel,
  fork,
  put,
  takeLatest,
  take,
  delay,
  select,
  retry
} from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import { prepareStemsForUpload } from 'pages/upload-page/store/utils/stems'
import * as errorActions from 'store/errors/actions'
import { reportToSentry } from 'store/errors/reportToSentry'
import { push } from 'utils/navigation'
import { waitForWrite } from 'utils/sagaHelpers'

import { trackNewRemixEvent } from '../cache/tracks/sagas'

import {
  addPremiumMetadata,
  getUSDCMetadata,
  recordGatedTracks
} from './sagaHelpers'

const { updateProgress } = uploadActions

type ProgressAction = ReturnType<typeof updateProgress>

const MAX_CONCURRENT_UPLOADS = 6
const MAX_CONCURRENT_PUBLISHES = 6

/**
 * Combines the metadata for a track and a collection (playlist or album),
 * taking the metadata from the playlist when the track is missing it.
 */
function* combineMetadata(
  trackMetadata: TrackMetadataForUpload,
  collectionMetadata: CollectionValues,
  albumTrackPrice?: number
) {
  const metadata = trackMetadata

  // @ts-expect-error - Typing is hard here because playlists and albums have different artwork types
  metadata.artwork = collectionMetadata.artwork

  if (!metadata.genre)
    metadata.genre = collectionMetadata.trackDetails?.genre ?? ''
  if (!metadata.mood)
    metadata.mood = collectionMetadata.trackDetails?.mood ?? null
  if (!metadata.release_date) {
    metadata.release_date = collectionMetadata.release_date ?? null
    metadata.is_scheduled_release =
      collectionMetadata.is_scheduled_release ?? false
  }

  if (metadata.tags === null && collectionMetadata.trackDetails?.tags) {
    // Take collection tags
    metadata.tags = collectionMetadata.trackDetails?.tags
  }

  // Set download & hidden status
  metadata.is_downloadable = !!collectionMetadata.is_downloadable

  metadata.is_unlisted = !!collectionMetadata.is_private
  if (collectionMetadata.is_private && collectionMetadata.field_visibility) {
    // Convert any undefined values to booleans
    const booleanFieldVisibility = mapValues(
      collectionMetadata.field_visibility,
      Boolean
    ) as FieldVisibility
    metadata.field_visibility = booleanFieldVisibility
  }

  // If the tracks were added as part of a premium album, add all the necessary premium track metadata
  if (albumTrackPrice !== undefined && albumTrackPrice > 0) {
    // is_download_gated must always be set to true for all premium tracks
    metadata.is_download_gated = true
    metadata.download_conditions = {
      usdc_purchase: {
        price: albumTrackPrice,
        splits: { 0: 0 }
      }
    }
    // Set up initial stream gating values
    metadata.is_stream_gated = true
    metadata.preview_start_seconds = 0
    metadata.stream_conditions = {
      usdc_purchase: { price: albumTrackPrice, splits: { 0: 0 } }
    }
    // Add splits to stream & download conditions
    yield* call(addPremiumMetadata, metadata)
  }
  return metadata
}

/**
 * Creates a callback that runs on upload progress in sdk and
 * reports that progress to the store via actions.
 */
const makeOnProgress = (
  trackIndex: number,
  stemIndex: number | null,
  progressChannel: Channel<ProgressAction>
) => {
  return (progress: Parameters<ProgressHandler>[0]) => {
    const key = 'audio' in progress ? 'audio' : 'art'
    const p =
      'audio' in progress
        ? progress.audio
        : 'art' in progress
          ? progress.art
          : null
    if (p === null) {
      return
    }
    const { upload, transcode } = p
    try {
      progressChannel.put(
        updateProgress({
          trackIndex,
          stemIndex,
          key,
          progress: {
            loaded: upload?.loaded,
            total: upload?.total,
            transcode: transcode?.decimal,
            status:
              !upload || upload.loaded !== upload.total
                ? ProgressStatus.UPLOADING
                : ProgressStatus.PROCESSING
          }
        })
      )
    } catch {
      // Sometimes this can fail repeatedly in quick succession (root cause TBD)
      // it doesn't seem to affect the CX so catch to avoid spamming sentry
    }
  }
}

/**
 * Deletes a list of tracks by track IDs.
 * Used in cleaning up orphaned stems or tracks of a collection.
 */
export function* deleteTracks(trackIds: ID[]) {
  const sdk = yield* getSDK()
  const userId = Id.parse(yield* call(queryCurrentUserId))
  if (!userId) {
    throw new Error('No user id found during delete. Not signed in?')
  }

  yield* all(
    trackIds.map((id) =>
      call([sdk.tracks, sdk.tracks.deleteTrack], {
        userId,
        trackId: Id.parse(id)
      })
    )
  )
}

/**
 * Worker that handles upload requests.
 * @param uploadQueue The queue of upload requests to pull from.
 * @param progressChannel The channel to report progress actions to.
 * @param responseChannel The channel to report the outcome to.
 */
function* uploadWorker(
  uploadQueue: Channel<UploadTask>,
  progressChannel: Channel<ProgressAction>,
  responseChannel: Channel<UploadTrackResponse>
) {
  while (true) {
    const task = yield* take(uploadQueue)
    const { trackIndex, stemIndex, track } = task
    try {
      const sdk = yield* getSDK()
      const userId = yield* call(queryCurrentUserId)
      if (!userId) {
        throw new Error('No user id found during upload. Not signed in?')
      }

      const coverArtFile =
        track.metadata.artwork && 'file' in track.metadata.artwork
          ? (track.metadata.artwork?.file ?? null)
          : null
      const metadata = trackMetadataForUploadToSdk(track.metadata)

      const updatedMetadata = yield* call(
        [sdk.tracks, sdk.tracks.uploadTrackFiles],
        {
          userId: Id.parse(userId),
          trackFile: fileToSdk(track.file, 'audio'),
          // coverArtFile will be undefined for stem uploads
          coverArtFile: coverArtFile
            ? fileToSdk(coverArtFile!, 'cover_art')
            : undefined,
          metadata,
          onProgress: makeOnProgress(trackIndex, stemIndex, progressChannel)
        }
      )

      yield* put(responseChannel, {
        type: 'UPLOADED',
        payload: {
          trackIndex,
          stemIndex,
          metadata: updatedMetadata
        }
      })
    } catch (e) {
      yield* put(responseChannel, {
        type: 'ERROR',
        payload: {
          trackId: track.metadata.track_id,
          phase: 'upload',
          trackIndex,
          stemIndex,
          error: e
        }
      })
    }
  }
}

/**
 * Worker that handles the entity manager writes.
 * @param publishQueue The queue of publish requests
 * @param responseChannel The channel to report the outcome to.
 */
function* publishWorker(
  publishQueue: Channel<PublishTask>,
  responseChannel: Channel<UploadTrackResponse>
) {
  while (true) {
    const task = yield* take(publishQueue)
    const { trackIndex, stemIndex, metadata } = task
    try {
      const sdk = yield* getSDK()
      const userId = yield* call(queryCurrentUserId)
      if (!userId) {
        throw new Error('No user id found during upload. Not signed in?')
      }

      const { trackId: updatedTrackId } = yield* call(
        [sdk.tracks, sdk.tracks.writeTrackToChain],
        Id.parse(userId),
        metadata
      )

      const decodedTrackId = OptionalHashId.parse(updatedTrackId)

      if (decodedTrackId) {
        yield* put(responseChannel, {
          type: 'PUBLISHED',
          payload: {
            trackIndex,
            stemIndex,
            trackId: decodedTrackId,
            metadata
          }
        })
      }
    } catch (e) {
      yield* put(responseChannel, {
        type: 'ERROR',
        payload: {
          trackId: metadata.trackId!,
          phase: 'publish',
          trackIndex,
          stemIndex,
          error: e
        }
      })
    }
  }
}

type UploadMetadata = Awaited<
  ReturnType<AudiusSdk['tracks']['uploadTrackFiles']>
>

/** Queued task for the upload worker. */
type UploadTask = {
  trackIndex: number
  stemIndex: number | null
  track: TrackForUpload
}

/** Upload worker success response payload */
type UploadedPayload = {
  trackIndex: number
  stemIndex: number | null
  metadata: UploadMetadata
}

/** Queued task for the publish worker. */
type PublishTask = {
  trackIndex: number
  stemIndex: number | null
  trackId: ID
  metadata: UploadMetadata
}

/** Publish worker success response payload */
type PublishedPayload = {
  trackIndex: number
  stemIndex: number | null
  trackId: ID
  metadata: UploadMetadata
}

/** Error response payload (from either worker). */
type ErrorPayload = {
  trackIndex: number
  stemIndex: number | null
  trackId?: ID
  phase: 'upload' | 'publish'
  error: unknown
}

/** All possible response payloads from workers. */
type UploadTrackResponse =
  | { type: 'UPLOADED'; payload: UploadedPayload }
  | { type: 'PUBLISHED'; payload: PublishedPayload }
  | { type: 'ERROR'; payload: ErrorPayload }

function isTask(worker: unknown): worker is Task {
  return worker !== null && typeof worker === 'object' && 'isRunning' in worker
}

/**
 * Spins up workers to handle uploading of tracks and their stems in parallel.
 *
 * Waits to publish parent tracks until their stems successfully upload.
 * If a stem fails, marks the parent as failed and unpublishes the other stems.
 *
 * Waits to publish collection tracks until all other tracks successfully upload.
 * If a track from a collection fails, marks the collection as failed and
 * unpublishes all other collection tracks.
 *
 * Also called from the edit track flow for uploading stems to existing tracks.
 * Those tracks must be uploaded as "tracks" since their parent is already
 * uploaded, rather than sending their parent with stems attached.
 */
export function* handleUploads({
  tracks,
  kind
}: {
  tracks: TrackForUpload[]
  kind: 'album' | 'playlist' | 'tracks' | 'stems'
}) {
  const isCollection = kind === 'album' || kind === 'playlist'
  const queryClient = yield* getContext('queryClient')
  const userId = (yield* call(queryCurrentUserId))!

  // Queue for the upload tasks (uploading files to storage)
  const uploadQueue = yield* call(
    channel<UploadTask>,
    buffers.expanding(tracks.length)
  )

  // Queue for the publish tasks (writing to entity manager)
  const publishQueue = yield* call(
    channel<PublishTask>,
    buffers.expanding(tracks.length)
  )

  // Channel to listen for responses
  const responseChannel = yield* call(
    channel<UploadTrackResponse>,
    buffers.expanding(200)
  )

  // Channel to relay progress actions
  const progressChannel = yield* call(channel<ProgressAction>)
  const actionDispatcherTask = yield* fork(
    actionChannelDispatcher,
    progressChannel
  )

  console.debug(`Queuing tracks (and stems if applicable) to upload...`)
  let stems = 0
  const pendingStemCount: Record<ID, number> = {}
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    yield* put(uploadQueue, { trackIndex: i, stemIndex: null, track })

    // Report analytics for each track
    yield* put(
      make(Name.TRACK_UPLOAD_TRACK_UPLOADING, {
        artworkSource:
          track.metadata.artwork && 'source' in track.metadata.artwork
            ? track.metadata.artwork?.source
            : undefined,
        trackId: track.metadata.track_id,
        genre: track.metadata.genre,
        moode: track.metadata.mood,
        size: track.file.size,
        fileType: track.file.type,
        name: track.file.name,
        downloadable: isContentFollowGated(track.metadata.download_conditions)
          ? 'follow'
          : track.metadata.is_downloadable
            ? 'yes'
            : 'no'
      })
    )

    if (track.metadata.stems?.length) {
      // track_id should be created and assigned ahead of time for a track with stems
      if (!track.metadata.track_id) {
        throw new Error('Track ID is required on parent track for stems')
      }
      // Process the track's stems
      const trackStems = prepareStemsForUpload(
        (track.metadata.stems ?? []) as StemUploadWithFile[],
        track.metadata.track_id
      )
      const stemCount = track.metadata.stems?.length ?? 0
      pendingStemCount[track.metadata.track_id] = stemCount
      stems += stemCount
      for (let j = 0; j < trackStems.length; j++) {
        const stem = trackStems[j]
        yield* put(uploadQueue, { trackIndex: i, stemIndex: j, track: stem })
      }
    }
  }

  const uploadRequestCount = tracks.length + stems
  const numUploadWorkers = Math.min(uploadRequestCount, MAX_CONCURRENT_UPLOADS)
  const numPublishWorkers = Math.min(
    uploadRequestCount,
    MAX_CONCURRENT_PUBLISHES
  )

  console.debug(
    `Spinning up ${numUploadWorkers} upload workers and ${numPublishWorkers} publish workers to upload ${tracks.length} tracks and ${stems} stems`
  )
  const uploadWorkers: Task[] = []
  for (let i = 0; i < numUploadWorkers; i++) {
    uploadWorkers.push(
      yield* fork(uploadWorker, uploadQueue, progressChannel, responseChannel)
    )
  }
  const publishWorkers: Task[] = []
  for (let i = 0; i < numPublishWorkers; i++) {
    publishWorkers.push(
      yield* fork(publishWorker, publishQueue, responseChannel)
    )
  }

  const pendingMetadata: UploadMetadata[] = []

  const errored: ErrorPayload[] = []
  const uploaded: UploadedPayload[] = []
  const published: PublishedPayload[] = []

  // Setup handlers for all the task results

  /** Handler for successful upload worker tasks */
  function* handleUploaded(payload: UploadedPayload) {
    uploaded.push(payload)
    const { trackIndex, stemIndex, metadata } = payload
    console.debug(
      `${stemIndex === null && kind !== 'stems' ? 'Track' : 'Stem'} ${
        metadata.title
      } uploaded`,
      { trackIndex, stemIndex }
    )

    if (payload.metadata.stemOf?.parentTrackId) {
      const parentTrackId = payload.metadata.stemOf.parentTrackId

      queryClient.setQueryData(
        getStemsQueryKey(parentTrackId),
        (currentStems: StemTrack[] | undefined) => {
          const newStem = stemTrackMetadataFromSDK({
            ...payload.metadata,
            id: Id.parse(parentTrackId + (payload.trackIndex + 1 + Date.now())),
            parentId: Id.parse(parentTrackId),
            userId: Id.parse(userId),
            blocknumber: 0,
            cid: '',
            category: payload.metadata.stemOf!.category!,
            origFilename: payload.metadata.origFilename!
          })
          return [...(currentStems ?? []), newStem!]
        }
      )
    }

    // We know trackId exists because we generate it in uploadMultipleTracks
    const trackId = metadata.trackId!
    const stemCount = pendingStemCount[trackId]

    if (isCollection || stemCount > 0) {
      // If parent track of stems or part of collection,
      // save the metadata and wait to publish when the last stem (for parent
      // track) or last track (for a collection) is uploaded.
      pendingMetadata[trackIndex] = metadata
    } else {
      yield* put(publishQueue, { trackIndex, stemIndex, trackId, metadata })
    }

    if (isCollection && uploaded.length === tracks.length) {
      // Publish the collection once all tracks are uploaded
      for (let i = 0; i < pendingMetadata.length; i++) {
        yield* put(publishQueue, {
          trackIndex: i,
          stemIndex: null,
          trackId: pendingMetadata[i].trackId!,
          metadata: pendingMetadata[i]
        })
      }
    }
  }

  /** Handler for successful publish worker tasks */
  function* handlePublished(payload: PublishedPayload) {
    published.push(payload)
    const { trackIndex, stemIndex, trackId, metadata } = payload
    console.debug(
      `${stemIndex === null && kind !== 'stems' ? 'Track' : 'Stem'} ${
        metadata.title
      } published`,
      { trackId }
    )

    // Mark progress as complete
    yield* put(
      updateProgress({
        trackIndex,
        stemIndex,
        key: 'art',
        progress: { status: ProgressStatus.COMPLETE }
      })
    )
    yield* put(
      updateProgress({
        trackIndex,
        stemIndex,
        key: 'audio',
        progress: { status: ProgressStatus.COMPLETE }
      })
    )

    const parentTrackId = tracks[trackIndex].metadata.track_id

    // Report metrics
    if (stemIndex !== null) {
      yield* put(
        make(Name.STEM_COMPLETE_UPLOAD, {
          id: trackId,
          parent_track_id: parentTrackId,
          category: tracks[trackIndex].metadata.stems?.[stemIndex].category
        })
      )
    } else {
      yield* put(make(Name.TRACK_UPLOAD_SUCCESS, { kind }))
    }

    // Trigger upload for parent if last stem
    if (stemIndex !== null) {
      if (!parentTrackId) {
        throw new Error('Parent track ID not found for stem')
      }
      pendingStemCount[parentTrackId] -= 1
      if (
        pendingStemCount[parentTrackId] === 0 &&
        pendingMetadata[trackIndex]
      ) {
        console.debug(
          `Stems finished for ${parentTrackId}, publishing parent: ${pendingMetadata[trackIndex].title}`
        )
        yield* put(publishQueue, {
          trackIndex,
          stemIndex: null,
          trackId: parentTrackId,
          metadata: pendingMetadata[trackIndex]
        })
        delete pendingMetadata[trackIndex]
      }
    }
  }

  /** Handler for errors in any worker */
  function* handleWorkerError(payload: ErrorPayload) {
    const { trackIndex, stemIndex, trackId, error, phase } = payload
    // Check to make sure we haven't already errored for this track.
    // This could happen if one of its stems failed.
    // Double counting would terminate the loop too soon.
    if (
      !errored.find(
        (e) => e.trackIndex === trackIndex && e.stemIndex === stemIndex
      )
    ) {
      errored.push(payload)
    }

    // Error this track
    yield* put(
      updateProgress({
        trackIndex,
        stemIndex,
        key: 'art',
        progress: { status: ProgressStatus.ERROR }
      })
    )
    yield* put(
      updateProgress({
        trackIndex,
        stemIndex,
        key: 'audio',
        progress: { status: ProgressStatus.ERROR }
      })
    )

    // Error this track's parent
    if (stemIndex !== null) {
      yield* put(responseChannel, {
        type: 'ERROR',
        payload: {
          trackIndex,
          stemIndex: null,
          trackId: tracks[trackIndex].metadata.track_id,
          error: new Error(`Stem ${stemIndex} failed to upload.`, {
            cause: payload.error
          }),
          phase
        }
      })
    } else {
      yield* put(make(Name.TRACK_UPLOAD_FAILURE, { kind }))
    }

    console.error(
      `Track ${trackId} (trackIndex: ${trackIndex}, stemIndex: ${stemIndex}) errored in the ${phase} phase:`,
      error
    )

    // Report to sentry
    const e = error instanceof Error ? error : new Error(String(error))
    yield* call(reportToSentry, {
      name: 'UploadWorker',
      error: e,
      additionalInfo: {
        trackId,
        metadata:
          stemIndex === null
            ? tracks[trackIndex].metadata
            : tracks[trackIndex].metadata.stems?.[stemIndex].metadata,
        fileSize: tracks[trackIndex].file.size,
        trackIndex,
        stemIndex,
        trackCount: tracks.length,
        stemCount: stems,
        phase,
        kind
      },
      feature: Feature.Upload
    })
  }

  console.debug('Waiting for workers...')
  const hasUnprocessedTracks = () =>
    published.length + errored.length < uploadRequestCount
  const collectionUploadErrored = () => errored.length > 0 && isCollection

  // Wait for the workers to process every track and stem
  // - unless uploading a collection and hit an error, in which case leave early
  while (hasUnprocessedTracks() && !collectionUploadErrored()) {
    const { type, payload } = yield* take(responseChannel)
    if (type === 'UPLOADED') {
      yield* call(handleUploaded, payload)
    } else if (type === 'PUBLISHED') {
      yield* call(handlePublished, payload)
    } else if (type === 'ERROR') {
      yield* call(handleWorkerError, payload)
    }
  }

  console.debug('Spinning down workers')
  for (const worker of uploadWorkers) {
    if (isTask(worker)) {
      yield* cancel(worker)
    }
  }
  for (const worker of publishWorkers) {
    if (isTask(worker)) {
      yield* cancel(worker)
    }
  }
  yield* call(progressChannel.close)
  yield* cancel(actionDispatcherTask)

  // Attempt to delete orphaned stems of failed tracks
  for (const errorPayload of errored) {
    const stemsToDelete = published.filter(
      (p) => tracks[p.trackIndex].metadata.track_id === errorPayload.trackId
    )
    if (stemsToDelete.length > 0) {
      console.debug(`Cleaning up ${stemsToDelete.length} orphaned stems...`)
      try {
        yield* call(
          deleteTracks,
          stemsToDelete.map((t) => t.trackId)
        )
        console.debug('Done cleaning up stems')
      } catch (e) {
        console.error('Failed to clean up orphaned stems:', e)
      }
    }
  }

  // Attempt to delete all orphaned collection tracks,
  // and throw as collection failures are all or nothing.
  if (collectionUploadErrored()) {
    console.debug(`Cleaning up ${published.length} orphaned tracks...`)
    try {
      yield* call(
        deleteTracks,
        published.map((t) => t.trackId)
      )
      console.debug('Done cleaning up tracks')
    } catch (e) {
      console.error('Failed to clean up orphaned tracks:', e)
    }
    // Errors were reported to sentry earlier in the upload process.
    // Throwing here so callers don't think they succeeded.
    throw new Error('Failed to upload tracks for collection.', {
      cause: errored
    })
  }

  const publishedTrackIds = published
    .filter((t) => t.stemIndex === null)
    .sort((a, b) => a.trackIndex - b.trackIndex)
    .map((p) => p.trackId)

  // If no tracks uploaded, we failed!
  if (publishedTrackIds.length === 0) {
    // Errors were reported to sentry earlier in the upload process.
    // Throwing here so callers don't think they succeeded.
    throw new Error('No tracks were successfully uploaded.', { cause: errored })
  }

  console.debug('Finished uploads')
  return publishedTrackIds
}

/**
 * Uploads a collection.
 * @param tracks The tracks of the collection
 * @param userId The user uploading
 * @param collectionMetadata misnomer - actually just the values from the form fields
 * @param isAlbum Whether the collection is an album or not.
 */
export function* uploadCollection(
  tracks: TrackForUpload[],
  collectionMetadata: CollectionValues,
  isAlbum: boolean,
  uploadType: UploadType
) {
  const sdk = yield* getSDK()

  yield waitForAccount()
  const queryClient = yield* getContext('queryClient')
  const userId = (yield* call(queryCurrentUserId))!
  // This field will get replaced
  let albumTrackPrice: number | undefined

  // If the collection is a premium album, this will populate the premium metadata (price/splits/etc)
  if (
    isAlbum &&
    isContentUSDCPurchaseGated(collectionMetadata.stream_conditions)
  ) {
    // albumTrackPrice will be parsed out of the collection metadata, so we keep a copy here
    albumTrackPrice =
      collectionMetadata.stream_conditions?.usdc_purchase.albumTrackPrice
    collectionMetadata.stream_conditions = yield* call(
      getUSDCMetadata,
      collectionMetadata.stream_conditions
    )
  }

  // Propagate the collection metadata to the tracks
  for (const track of tracks) {
    track.metadata = yield* call(
      combineMetadata,
      track.metadata,
      collectionMetadata,
      albumTrackPrice
    )
  }

  // Upload the tracks
  const trackIds = yield* call(handleUploads, {
    tracks,
    kind: isAlbum ? 'album' : 'playlist'
  })

  yield* call(
    recordGatedTracks,
    tracks.map((t) => t.metadata)
  )

  const playlistId = yield* call([
    sdk.playlists,
    sdk.playlists.generatePlaylistId
  ])
  if (playlistId == null) {
    throw new Error('Failed to get playlist ID')
  }

  // Finally, create the playlist
  yield* put(
    confirmerActions.requestConfirmation(
      `${collectionMetadata.playlist_name}_${Date.now()}`,
      function* () {
        try {
          const { artwork } = collectionMetadata

          const coverArtFile =
            artwork && 'file' in artwork ? (artwork?.file ?? null) : null

          if (isAlbum) {
            // Create album
            if (!coverArtFile) {
              throw new Error('Cover art file is required for albums')
            }

            yield* call([sdk.albums, sdk.albums.createAlbum], {
              metadata: albumMetadataForCreateWithSDK(
                collectionMetadata as unknown as Collection
              ),
              userId: Id.parse(userId),
              albumId: Id.parse(playlistId),
              trackIds: trackIds.map((id) => Id.parse(id)),
              coverArtFile: fileToSdk(coverArtFile, 'cover_art')
            })
          } else {
            // Create playlist
            yield* call([sdk.playlists, sdk.playlists.createPlaylist], {
              metadata: playlistMetadataForCreateWithSDK(
                collectionMetadata as unknown as Collection
              ),
              userId: Id.parse(userId),
              playlistId: Id.parse(playlistId),
              trackIds: trackIds.map((id) => Id.parse(id)),
              coverArtFile: coverArtFile
                ? fileToSdk(coverArtFile!, 'cover_art')
                : undefined
            })
          }
        } catch (error) {
          console.debug('Caught an error creating playlist')
          if (playlistId) {
            console.debug('Deleting playlist')
            // If we got a playlist ID back, that means we
            // created the playlist but adding tracks to it failed. So we must delete the playlist
            yield* call([sdk.playlists, sdk.playlists.deletePlaylist], {
              userId: Id.parse(userId),
              playlistId: Id.parse(playlistId)
            })
            console.debug('Playlist deleted successfully')
          }
          // Throw to trigger the fail callback
          throw error instanceof Error
            ? error
            : new Error(`Error creating playlist: ${error}`)
        }

        const { data = [] } = yield* call(
          [sdk.full.playlists, sdk.full.playlists.getPlaylist],
          {
            playlistId: Id.parse(playlistId),
            userId: OptionalId.parse(userId)
          }
        )
        const [collection] = transformAndCleanList(
          data,
          userCollectionMetadataFromSDK
        )
        return collection
      },
      function* (confirmedPlaylist: Collection) {
        yield* put(
          uploadActions.uploadTracksSucceeded({
            id: confirmedPlaylist.playlist_id,
            trackMetadatas: [],
            completedEntity: confirmedPlaylist,
            uploadType
          })
        )
        const user = yield* queryUser(userId)

        yield* call(primeCollectionDataSaga, [confirmedPlaylist])
        yield* put(
          accountActions.addAccountPlaylist({
            id: confirmedPlaylist.playlist_id,
            name: confirmedPlaylist.playlist_name,
            is_album: confirmedPlaylist.is_album,
            permalink: confirmedPlaylist.permalink!,
            user: {
              id: user!.user_id,
              handle: user!.handle
            }
          })
        )
        yield* put(
          libraryPageActions.addLocalCollection({
            collectionId: confirmedPlaylist.playlist_id,
            isAlbum: confirmedPlaylist.is_album,
            category: LibraryCategory.Favorite
          })
        )
        queryClient.invalidateQueries({
          queryKey: getUserQueryKey(userId)
        })
      },
      function* ({ error }) {
        console.error(
          `Create playlist call failed, deleting tracks: ${JSON.stringify(
            trackIds
          )}`
        )
        try {
          yield* all(
            trackIds.map((id) =>
              sdk.tracks.deleteTrack({
                userId: Id.parse(userId),
                trackId: Id.parse(id)
              })
            )
          )
          console.debug('Deleted tracks.')
        } catch (err) {
          console.debug(`Could not delete all tracks: ${err}`)
        }
        // Handle error loses error details, so call reportToSentry explicitly
        yield* call(reportToSentry, {
          name: 'UploadCollection',
          error,
          additionalInfo: {
            trackIds,
            playlistId,
            isAlbum,
            collectionMetadata
          },
          feature: Feature.Upload
        })
        yield* put(uploadActions.uploadTracksFailed())
        yield* put(
          errorActions.handleError({
            message: error.message,
            shouldRedirect: true,
            shouldReport: false
          })
        )
      }
    )
  )
}

/**
 * Uploads any number of standalone tracks.
 * @param tracks the tracks to upload
 */
export function* uploadMultipleTracks(
  tracks: TrackForUpload[],
  uploadType: UploadType
) {
  const sdk = yield* getSDK()

  const queryClient = yield* getContext('queryClient')

  // Ensure the user is logged in
  yield* call(waitForAccount)

  // Get the IDs ahead of time, so that stems can be associated.
  const tracksWithIds = yield* all(
    tracks.map((track) =>
      call(function* () {
        const id = yield* call([sdk.tracks, sdk.tracks.generateTrackId])
        return {
          ...track,
          metadata: {
            ...track.metadata,
            track_id: id
          }
        }
      })
    )
  )

  // Upload tracks and stems parallel together
  const trackIds = yield* call(handleUploads, {
    tracks: tracksWithIds,
    kind: 'tracks'
  })

  // Get true track metadatas back with retry logic
  const newTracks = yield* retry(
    20, // max attempts
    2000, // delay between attempts in ms
    function* () {
      const tracks = yield* call(queryTracks, trackIds, {
        force: true,
        staleTime: 0
      })
      if (tracks.length === 0) {
        throw new Error('No tracks found after uploading.')
      }
      return tracks
    }
  )

  // Make sure track count changes for this user
  const account = yield* call(queryAccountUser)

  queryClient.setQueryData(getUserQueryKey(account!.user_id), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          track_count: newTracks.length
        }
  )

  // At this point, the upload was success! The rest is metrics.
  yield* put(
    uploadActions.uploadTracksSucceeded({
      id: newTracks[0].track_id,
      trackMetadatas: newTracks,
      completedEntity: newTracks[0],
      uploadType
    })
  )

  // Send analytics for any gated content
  yield* call(
    recordGatedTracks,
    tracksWithIds.map((track) => track.metadata)
  )

  // If the hide remixes is turned on, send analytics event
  for (let i = 0; i < newTracks.length; i += 1) {
    const track = newTracks[i]
    if (track.field_visibility?.remixes === false) {
      yield* put(
        make(Name.REMIX_HIDE, {
          id: track.track_id,
          handle: account!.handle
        })
      )
    }
  }

  // Send analytics for any remixes
  for (const remixTrackData of newTracks) {
    const remixTrack = remixTrackData
    if (
      remixTrack.remix_of !== null &&
      Array.isArray(remixTrack.remix_of?.tracks) &&
      remixTrack.remix_of.tracks.length > 0
    ) {
      yield* call(trackNewRemixEvent, remixTrack)
    }
  }

  // Refetch the user
  queryClient.invalidateQueries({
    queryKey: getUserQueryKey(account!.user_id)
  })

  // Invalidate the uploader's profile tracks cache
  queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.profileTracks, account!.handle]
  })

  for (const track of newTracks) {
    const parentTrackId = track.remix_of?.tracks[0]?.parent_track_id

    // If it's a remix, invalidate the parent track's lineup and remixes page
    if (parentTrackId) {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.trackPageLineup, parentTrackId]
      })
      // Invalidate all possible combinations of remixes queries for the parent track
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.remixes, parentTrackId],
        exact: false
      })
    }
  }
}

function* uploadTracksAsync(
  action: ReturnType<typeof uploadActions.uploadTracks>
) {
  yield* call(waitForWrite)
  const payload = action.payload
  yield* put(uploadActions.uploadTracksRequested(payload))

  const kind = (() => {
    switch (payload.uploadType) {
      case UploadType.PLAYLIST:
        return 'playlist'
      case UploadType.ALBUM:
        return 'album'
      case UploadType.INDIVIDUAL_TRACK:
      case UploadType.INDIVIDUAL_TRACKS:
      default:
        return 'tracks'
    }
  })()

  try {
    const recordEvent = make(Name.TRACK_UPLOAD_START_UPLOADING, {
      count: payload.tracks.length,
      kind
    })
    yield* put(recordEvent)

    const tracks = payload.tracks

    // Prep the USDC purchase conditions
    for (const trackUpload of tracks) {
      trackUpload.metadata = yield* call(
        addPremiumMetadata<TrackMetadataForUpload>,
        trackUpload.metadata
      )
    }

    // Upload content.
    const isAlbum = payload.uploadType === UploadType.ALBUM
    const isCollection = payload.uploadType === UploadType.PLAYLIST || isAlbum
    if (isCollection) {
      yield* call(
        uploadCollection,
        tracks,
        payload.metadata,
        isAlbum,
        payload.uploadType
      )
    } else {
      yield* call(uploadMultipleTracks, tracks, payload.uploadType)
    }
    yield* put(
      make(Name.TRACK_UPLOAD_COMPLETE_UPLOAD, {
        trackCount: payload.tracks.length,
        kind
      })
    )
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    // Handle error loses error details, so call reportToSentry explicitly
    yield* call(reportToSentry, {
      error,
      name: 'UploadTracks',
      additionalInfo: {
        kind,
        tracks: payload.tracks
      },
      feature: Feature.Upload
    })
    yield* put(uploadActions.uploadTracksFailed())
    yield* put(
      errorActions.handleError({
        message: error.message,
        shouldRedirect: true,
        shouldReport: false
      })
    )
  }
}

function* updateTrackAudioAsync(
  action: ReturnType<typeof uploadActions.updateTrackAudio>
) {
  yield* call(waitForWrite)
  const payload = action.payload

  try {
    const tracks = yield* call(queryTracks, [payload.trackId])

    if (!tracks[0]) {
      throw new Error('Missing track for track audio replace.')
    }
    const track = tracks[0]
    const sdk = yield* getSDK()
    const userId = yield* call(queryCurrentUserId)

    if (!userId) {
      throw new Error('No user id found during upload. Not signed in?')
    }

    const metadata = trackMetadataForUploadToSdk({
      ...track,
      ...(payload.metadata ?? {})
    })

    const dispatch = yield* getContext('dispatch')
    const handleProgressUpdate = (progress: Parameters<ProgressHandler>[0]) => {
      if (!('audio' in progress)) return
      const { upload, transcode } = progress.audio

      const uploadVal =
        transcode === undefined
          ? (upload?.loaded ?? 0) / (upload?.total ?? 1)
          : 1

      dispatch(
        replaceTrackProgressModalActions.set({
          progress: { upload: uploadVal, transcode: transcode?.decimal ?? 0 },
          error: false
        })
      )
    }

    yield* put(
      replaceTrackProgressModalActions.set({
        progress: { upload: 0, transcode: 0 },
        error: false
      })
    )
    const updatedMetadata = yield* call(
      [sdk.tracks, sdk.tracks.uploadTrackFiles],
      {
        userId: Id.parse(userId),
        trackFile: fileToSdk(payload.file, 'audio'),
        metadata,
        onProgress: handleProgressUpdate
      }
    )

    const newMetadata = {
      ...payload.metadata,
      bpm: metadata.isCustomBpm ? track.bpm : null,
      duration: updatedMetadata.duration,
      musical_key: metadata.isCustomMusicalKey ? metadata.musicalKey : null,
      audio_analysis_error_count: 0,
      orig_filename: updatedMetadata.origFilename || '',
      orig_file_cid: updatedMetadata.origFileCid,
      preview_cid: updatedMetadata.previewCid || '',
      preview_start_seconds: updatedMetadata.previewStartSeconds ?? 0,
      track_cid: updatedMetadata.trackCid || '',
      audio_upload_id: updatedMetadata.audioUploadId
    }

    yield* put(
      cacheTracksActions.editTrack(
        track.track_id,
        newMetadata as TrackMetadataForUpload
      )
    )

    // If the track with replaced audio is in the queue, clear it
    const queueOrder = yield* select(queueSelectors.getOrder)
    if (queueOrder.map((item) => item.id).includes(track.track_id)) {
      yield* put(queueActions.clear({}))
      yield* put(playerActions.stop({}))
    }

    // Delay to allow the user to see that the track replace upload has finished
    yield* delay(1500)

    yield* put(replaceTrackProgressModalActions.close())
    yield* put(push(track.permalink))
  } catch (e) {
    yield* put(
      replaceTrackProgressModalActions.set({
        progress: { upload: 0, transcode: 0 },
        error: true
      })
    )
  }
}

function* watchUploadTracks() {
  yield* takeLatest(uploadActions.UPLOAD_TRACKS, uploadTracksAsync)
}

function* watchUpdateTrackAudio() {
  yield* takeLatest(uploadActions.UPDATE_TRACK_AUDIO, updateTrackAudioAsync)
}

export default function sagas() {
  return [watchUploadTracks, watchUpdateTrackAudio]
}
