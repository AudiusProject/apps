import { useRef, useCallback } from 'react'

import { HashId, type UploadTrackFilesTask } from '@audius/sdk'
import { useDispatch } from 'react-redux'

import { fileToSdk } from '~/adapters'
import {
  Name,
  type StemUploadWithFile,
  isContentFollowGated,
  Feature
} from '~/models'
import {
  type TrackForUpload,
  uploadActions,
  ProgressStatus,
  type UploadFormState,
  type CollectionFormState,
  type TrackFormState,
  UploadType
} from '~/store'

import { type QueryContextType, useQueryContext } from '../utils'

import { usePublishCollection } from './usePublishCollection'
import { usePublishTracks } from './usePublishTracks'
import { useUploadFiles } from './useUploadFiles'

const {
  updateProgress,
  uploadTracksRequested,
  uploadTracksFailed,
  uploadTracksSucceeded,
  updateFormState
} = uploadActions

const getStemUploadTasks = async (
  context: Pick<QueryContextType, 'audiusSdk' | 'dispatch'>,
  tracks: TrackForUpload[]
) => {
  const sdk = await context.audiusSdk()
  return tracks.flatMap(
    (t) =>
      t.metadata.stems?.map((stemFile, index) => {
        const file = (stemFile as StemUploadWithFile).file
        const task = sdk.tracks.uploadTrackFiles({
          audioFile: fileToSdk(file, 'audio'),
          onProgress: (_, { key, loaded, total, transcode }) => {
            context.dispatch(
              updateProgress({
                clientId: t.clientId,
                stemIndex: index,
                key,
                progress: {
                  status:
                    transcode === undefined
                      ? ProgressStatus.UPLOADING
                      : ProgressStatus.PROCESSING,
                  loaded,
                  total,
                  transcode
                }
              })
            )
          }
        })
        return {
          clientId: t.clientId,
          key: 'audio' as const,
          ...task
        }
      }) ?? []
  )
}

const getCoverArtUploadTasks = async (
  context: Pick<QueryContextType, 'audiusSdk' | 'dispatch'>,
  tracks: TrackForUpload[]
) => {
  const sdk = await context.audiusSdk()
  return tracks
    .filter(
      (t) =>
        t.metadata?.artwork &&
        'file' in t.metadata.artwork &&
        t.metadata.artwork.file
    )
    .map((t) => {
      if (
        !t.metadata.artwork ||
        !('file' in t.metadata.artwork) ||
        !t.metadata.artwork.file
      ) {
        throw new Error('Artwork file missing')
      }
      const file = fileToSdk(t.metadata.artwork.file, 'cover_art')
      const task = sdk.tracks.uploadTrackFiles({
        imageFile: file,
        onProgress: (_, { key, loaded, total }) => {
          context.dispatch(
            uploadActions.updateProgress({
              clientId: t.clientId,
              key,
              stemIndex: null,
              progress: {
                status:
                  loaded && total && loaded >= total
                    ? ProgressStatus.COMPLETE
                    : ProgressStatus.UPLOADING,
                loaded,
                total,
                transcode: 0
              }
            })
          )
        }
      })
      return {
        clientId: t.clientId,
        key: 'image' as const,
        ...task
      }
    })
}

const getTrackUploadTasks = async (
  context: Pick<QueryContextType, 'audiusSdk' | 'dispatch'>,
  tracks: TrackForUpload[]
) => {
  const sdk = await context.audiusSdk()
  return tracks.map((t) => {
    const task = sdk.tracks.uploadTrackFiles({
      audioFile: fileToSdk(t.file, 'audio'),
      onProgress: (_, { key, loaded, total, transcode }) => {
        context.dispatch(
          uploadActions.updateProgress({
            clientId: t.clientId,
            key,
            stemIndex: null,
            progress: {
              status:
                transcode === undefined
                  ? ProgressStatus.UPLOADING
                  : ProgressStatus.PROCESSING,
              loaded,
              total,
              transcode
            }
          })
        )
      }
    })
    return {
      clientId: t.clientId,
      key: 'audio' as const,
      ...task
    }
  })
}

export const useUpload = (
  onSuccess?: () => void,
  onError?: (error: Error) => void
) => {
  const dispatch = useDispatch()
  const {
    audiusSdk,
    analytics: { make, track },
    reportToSentry
  } = useQueryContext()

  const { mutateAsync: publishTracksAsync } = usePublishTracks()
  const { mutateAsync: publishCollectionAsync } = usePublishCollection()
  const uploadFiles = useUploadFiles()

  // Holds the upload promise so that uploading tracks can start immediately
  // and then be awaited on the finish step.
  const trackUploadPromise = useRef<ReturnType<typeof uploadTrackFiles>>(
    Promise.resolve([])
  )

  // Tracks individual track files so they can be replaced if needed
  const trackFiles = useRef<
    Map<string, NonNullable<UploadFormState['tracks']>[number]['file']>
  >(new Map())

  // Tracks individual file upload tasks so they can be aborted if needed
  const uploadTasks = useRef<Map<string, UploadTrackFilesTask>>(new Map())

  const uploadTrackFiles = useCallback(
    async (tracks: TrackForUpload[]) => {
      // Track analytics for each track being uploaded
      tracks.forEach((t) => {
        trackFiles.current.set(t.clientId, t.file)
        track(
          make({
            eventName: Name.TRACK_UPLOAD_TRACK_UPLOADING,
            artworkSource:
              t.metadata.artwork && 'source' in t.metadata.artwork
                ? (t.metadata.artwork.source as 'unsplash' | 'original')
                : 'original',
            trackId: t.metadata.track_id!,
            genre: t.metadata.genre ?? '',
            mood: t.metadata.mood ?? undefined,
            size: t.file.size ?? -1,
            fileType: t.file.type ?? '',
            name: t.file.name ?? '',
            downloadable: isContentFollowGated(t.metadata.download_conditions)
              ? 'follow'
              : t.metadata.is_downloadable
                ? 'yes'
                : 'no'
          })
        )
      })

      const tasks = await getTrackUploadTasks({ audiusSdk, dispatch }, tracks)

      // Store the upload tasks for potential aborting later
      tasks.forEach((task, i) => {
        uploadTasks.current.set(tracks[i]!.clientId, task)
      })

      return await uploadFiles(tasks)
    },
    [audiusSdk, dispatch, uploadFiles, track, make]
  )

  /**
   * Replaces track files that have been changed in the edit form
   * by aborting their previous upload and re-uploading the new file
   */
  const replaceTrackFiles = useCallback(
    (tracks: TrackForUpload[]) => {
      // Check if any track files were replaced (same clientId, different File)
      const tracksWithReplacedFiles =
        tracks?.filter((track) => {
          const existingFile = trackFiles.current.get(track.clientId)
          return existingFile && existingFile !== track.file
        }) ?? []

      // Abort and remove upload tasks for removed or replaced files
      for (const key of uploadTasks.current.keys()) {
        const isRemoved = !tracks.find((t) => t.clientId === key)
        const isReplaced = !!tracksWithReplacedFiles.find(
          (t) => t.clientId === key
        )
        if (isRemoved || isReplaced) {
          uploadTasks.current.get(key)?.abort()
          uploadTasks.current.delete(key)
        }
      }

      // Keep the existing uploads and add the new uploads for replaced files
      if (tracksWithReplacedFiles.length > 0) {
        trackUploadPromise.current = Promise.all([
          uploadTrackFiles(tracksWithReplacedFiles),
          trackUploadPromise.current
        ]).then(([newUploads, oldUploads]) => [
          ...newUploads,
          ...oldUploads.filter((oldUpload) => {
            return !newUploads.find((nu) => nu.clientId === oldUpload.clientId)
          })
        ])
      }
    },
    [uploadTrackFiles]
  )

  const uploadTrackArtworks = useCallback(
    async (tracks: TrackForUpload[]) => {
      const tasks = await getCoverArtUploadTasks(
        { audiusSdk, dispatch },
        tracks
      )
      return await uploadFiles(tasks)
    },
    [audiusSdk, dispatch, uploadFiles]
  )

  const uploadCollectionArtwork = useCallback(
    async (formState: CollectionFormState) => {
      const imageFile =
        formState.metadata?.artwork && 'file' in formState.metadata.artwork
          ? formState.metadata.artwork.file
          : null
      if (!imageFile) {
        return
      }
      const sdk = await audiusSdk()

      // Finish the audio progress for the collection (there is none)
      dispatch(
        updateProgress({
          clientId: 'collection-artwork',
          key: 'audio',
          stemIndex: null,
          progress: { status: ProgressStatus.COMPLETE }
        })
      )

      const uploadTask = sdk.tracks.uploadTrackFiles({
        imageFile: fileToSdk(imageFile, 'artwork'),
        onProgress: (_, { key, loaded, total }) => {
          dispatch(
            updateProgress({
              clientId: 'collection-artwork',
              key,
              stemIndex: null,
              progress: {
                status:
                  loaded && total && loaded >= total
                    ? ProgressStatus.COMPLETE
                    : ProgressStatus.UPLOADING,
                loaded,
                total,
                transcode: 0
              }
            })
          )
        }
      })

      return await uploadFiles([
        { ...uploadTask, clientId: 'collection-artwork', key: 'image' }
      ])
    },
    [audiusSdk, dispatch, uploadFiles]
  )

  const uploadStemFiles = useCallback(
    async (tracks: TrackForUpload[]) => {
      const tasks = await getStemUploadTasks({ audiusSdk, dispatch }, tracks)
      return await uploadFiles(tasks)
    },
    [audiusSdk, dispatch, uploadFiles]
  )

  const startUpload = useCallback(
    (formState: CollectionFormState | TrackFormState) => {
      trackUploadPromise.current = uploadTrackFiles(formState.tracks ?? [])
    },
    [uploadTrackFiles]
  )

  const finishUpload = useCallback(
    async (formState: CollectionFormState | TrackFormState) => {
      dispatch(updateFormState(formState))
      const kind = (() => {
        switch (formState.uploadType) {
          case UploadType.ALBUM:
            return 'album'
          case UploadType.PLAYLIST:
            return 'playlist'
          case UploadType.INDIVIDUAL_TRACK:
            return 'single_track'
          default:
            return 'multi_track'
        }
      })()

      const tracks = formState.tracks ?? []
      const uploadType = formState.uploadType

      // Track start of upload
      track(
        make({
          eventName: Name.TRACK_UPLOAD_START_UPLOADING,
          count: formState.tracks?.length ?? 0,
          kind
        })
      )

      dispatch(uploadTracksRequested(formState))

      // Replace tracks as necessary
      replaceTrackFiles(tracks)

      let stemUploads: Awaited<ReturnType<typeof uploadStemFiles>> = []
      let trackUploads: Awaited<ReturnType<typeof uploadTrackFiles>> = []

      // Wait for stems and tracks to upload before publishing
      ;[stemUploads, trackUploads] = await Promise.all([
        uploadStemFiles(tracks),
        trackUploadPromise.current
      ])

      // If every track file failed to upload, fail the entire upload
      if (trackUploads.every((tu) => tu.error)) {
        const error = new Error('All track uploads failed')
        console.error(error.message)
        dispatch(uploadTracksFailed())
        onError?.(error)
        return
      }

      if (
        uploadType === UploadType.INDIVIDUAL_TRACKS ||
        uploadType === UploadType.INDIVIDUAL_TRACK
      ) {
        try {
          const artworks = await uploadTrackArtworks(tracks)
          const imageUploadMap = artworks.reduce(
            (acc, art) => {
              acc[art.clientId] = art
              return acc
            },
            {} as Record<string, (typeof artworks)[number]>
          )
          const audioUploadMap = trackUploads.reduce(
            (acc, track) => {
              acc[track.clientId] = track
              return acc
            },
            {} as Record<string, (typeof trackUploads)[number]>
          )

          const publishRes = await publishTracksAsync(
            tracks
              .filter(
                (t) =>
                  audioUploadMap[t.clientId]?.audioUploadResponse &&
                  imageUploadMap[t.clientId]?.imageUploadResponse
              )
              .map((t) => ({
                clientId: t.clientId,
                metadata: t.metadata,
                audioUploadResponse:
                  audioUploadMap[t.clientId]!.audioUploadResponse!,
                imageUploadResponse:
                  imageUploadMap[t.clientId]!.imageUploadResponse!,
                stemsUploadResponses: stemUploads
                  .filter(
                    (su) => su.clientId === t.clientId && su.audioUploadResponse
                  )
                  .map((su) => su.audioUploadResponse!)
              }))
          )

          const failedTracks = publishRes.filter((res) => res.error)
          if (publishRes.length !== tracks.length || failedTracks.length > 0) {
            throw new Error('Some tracks failed to publish')
          }

          // Track complete upload analytics
          track(
            make({
              eventName: Name.TRACK_UPLOAD_COMPLETE_UPLOAD,
              count: tracks.length,
              kind
            })
          )

          if (uploadType === UploadType.INDIVIDUAL_TRACK) {
            dispatch(
              uploadTracksSucceeded({
                id: HashId.parse(publishRes[0]!.trackId)
              })
            )
            onSuccess?.()
          } else if (uploadType === UploadType.INDIVIDUAL_TRACKS) {
            dispatch(uploadTracksSucceeded({ id: null }))
            onSuccess?.()
          }
        } catch (err) {
          console.error('Error publishing tracks:', err)
          track(
            make({
              eventName: Name.TRACK_UPLOAD_FAILURE,
              kind
            })
          )
          dispatch(uploadTracksFailed())
          onError?.(err as Error)
        }
      } else if (
        uploadType === UploadType.ALBUM ||
        uploadType === UploadType.PLAYLIST
      ) {
        try {
          const artwork = await uploadCollectionArtwork(
            formState as CollectionFormState
          )
          const publishRes = await publishCollectionAsync({
            collectionMetadata: formState.metadata,
            tracks: tracks.map((t) => {
              const imageUploadResponse = artwork?.[0].imageUploadResponse
              if (!imageUploadResponse) {
                throw new Error('No collection artwork upload found')
              }
              const audioUploadResponse = trackUploads.find(
                (ut) => ut.clientId === t.clientId
              )!.audioUploadResponse
              if (!audioUploadResponse) {
                throw new Error(`No audio found for track ${t.clientId}`)
              }
              return {
                clientId: t.clientId,
                metadata: t.metadata,
                audioUploadResponse,
                imageUploadResponse
              }
            })
          })

          // Track complete upload analytics
          track(
            make({
              eventName: Name.TRACK_UPLOAD_COMPLETE_UPLOAD,
              kind,
              count: tracks.length
            })
          )

          dispatch(
            uploadTracksSucceeded({ id: HashId.parse(publishRes.playlistId) })
          )
          onSuccess?.()
        } catch (err) {
          console.error('Error publishing collection:', err)
          track(
            make({
              eventName: Name.TRACK_UPLOAD_FAILURE,
              kind: uploadType === UploadType.ALBUM ? 'album' : 'playlist'
            })
          )
          reportToSentry({
            error: err as Error,
            name: 'Upload: Collection Publish',
            additionalInfo: {
              collectionType: uploadType,
              trackCount: tracks.length,
              tracks: tracks.map((t) => ({
                title: t.metadata.title,
                hasStems: !!t.metadata.stems?.length
              }))
            },
            feature: Feature.Upload
          })
          dispatch(uploadTracksFailed())
          onError?.(err as Error)
        }
      }
    },
    [
      dispatch,
      track,
      make,
      replaceTrackFiles,
      uploadStemFiles,
      uploadTrackArtworks,
      publishTracksAsync,
      uploadCollectionArtwork,
      publishCollectionAsync,
      reportToSentry,
      onError,
      onSuccess
    ]
  )

  return { startUpload, finishUpload }
}
