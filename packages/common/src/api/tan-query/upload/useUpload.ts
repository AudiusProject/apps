import { useRef, useCallback } from 'react'

import { HashId, Id, type UploadTrackFilesTask } from '@audius/sdk'
import { useDispatch } from 'react-redux'

import { fileToSdk } from '~/adapters'
import { Name, type StemUploadWithFile } from '~/models'
import {
  type TrackForUpload,
  uploadActions,
  ProgressStatus,
  type UploadFormState,
  type CollectionFormState,
  type TrackFormState,
  UploadType
} from '~/store'

import { useCurrentAccount } from '../users/account/useCurrentAccount'
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
  tracks: TrackForUpload[],
  userId: number
) => {
  const sdk = await context.audiusSdk()
  return tracks.flatMap(
    (t) =>
      t.metadata.stems?.map((stemFile, index) => {
        const file = (stemFile as StemUploadWithFile).file
        const task = sdk.tracks.uploadTrackFiles({
          audioFile: fileToSdk(file, 'audio'),
          userId: Id.parse(userId),
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
  tracks: TrackForUpload[],
  userId: number
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
        userId: Id.parse(userId),
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
  tracks: TrackForUpload[],
  userId: number
) => {
  const sdk = await context.audiusSdk()
  return tracks.map((t) => {
    const task = sdk.tracks.uploadTrackFiles({
      audioFile: fileToSdk(t.file, 'audio'),
      userId: Id.parse(userId),
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
    analytics: { make, track }
  } = useQueryContext()
  const { data: account } = useCurrentAccount()
  const userId = account?.userId ?? undefined
  const requireUserId = useCallback(() => {
    if (userId === undefined) {
      throw new Error('useUpload: no current user id — cannot upload')
    }
    return userId
  }, [userId])

  const { mutateAsync: publishTracksAsync } = usePublishTracks()
  const { mutateAsync: publishCollectionAsync } = usePublishCollection()
  const uploadFiles = useUploadFiles()

  const trackUploadPromise = useRef<ReturnType<typeof uploadTrackFiles>>(
    Promise.resolve([])
  )

  const trackFiles = useRef<
    Map<string, NonNullable<UploadFormState['tracks']>[number]['file']>
  >(new Map())

  const uploadTasks = useRef<Map<string, UploadTrackFilesTask>>(new Map())

  const uploadTrackFiles = useCallback(
    async (tracks: TrackForUpload[]) => {
      tracks.forEach((t) => {
        trackFiles.current.set(t.clientId, t.file)
      })

      const tasks = await getTrackUploadTasks(
        { audiusSdk, dispatch },
        tracks,
        requireUserId()
      )

      tasks.forEach((task, i) => {
        uploadTasks.current.set(tracks[i]!.clientId, task)
      })

      return await uploadFiles(tasks)
    },
    [audiusSdk, dispatch, uploadFiles, requireUserId]
  )

  const replaceTrackFiles = useCallback(
    (tracks: TrackForUpload[]) => {
      const tracksWithReplacedFiles =
        tracks?.filter((track) => {
          const existingFile = trackFiles.current.get(track.clientId)
          return existingFile && existingFile !== track.file
        }) ?? []

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
        tracks,
        requireUserId()
      )
      return await uploadFiles(tasks)
    },
    [audiusSdk, dispatch, uploadFiles, requireUserId]
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
        userId: Id.parse(requireUserId()),
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
    [audiusSdk, dispatch, uploadFiles, requireUserId]
  )

  const uploadStemFiles = useCallback(
    async (tracks: TrackForUpload[]) => {
      const tasks = await getStemUploadTasks(
        { audiusSdk, dispatch },
        tracks,
        requireUserId()
      )
      return await uploadFiles(tasks)
    },
    [audiusSdk, dispatch, uploadFiles, requireUserId]
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

      track(
        make({
          eventName: Name.TRACK_UPLOAD_START_UPLOADING,
          count: formState.tracks?.length ?? 0,
          kind
        })
      )

      dispatch(uploadTracksRequested(formState))

      replaceTrackFiles(tracks)

      let stemUploads: Awaited<ReturnType<typeof uploadStemFiles>> = []
      let trackUploads: Awaited<ReturnType<typeof uploadTrackFiles>> = []

      // Wait for stems and tracks to upload before publishing
      ;[stemUploads, trackUploads] = await Promise.all([
        uploadStemFiles(tracks),
        trackUploadPromise.current
      ])

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
          console.error('Upload: Collection Publish', err as Error)
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
      onError,
      onSuccess
    ]
  )

  return { startUpload, finishUpload }
}
