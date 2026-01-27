import { useRef, useCallback } from 'react'

import { AudiusSdk, HashId } from '@audius/sdk'
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
  uploadTracksSucceeded
} = uploadActions

const getStemUploadHandles = async (
  context: Pick<QueryContextType, 'audiusSdk' | 'dispatch'>,
  tracks: TrackForUpload[]
) => {
  const sdk = await context.audiusSdk()
  return tracks.flatMap(
    (t) =>
      t.metadata.stems?.map((stemFile, index) => {
        const file = (stemFile as StemUploadWithFile).file
        const uploadHandle = sdk.tracks.uploadTrackFiles({
          audioFile: fileToSdk(file, 'audio'),
          onProgress: (key, { loaded, total, transcode }) => {
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
          ...uploadHandle
        }
      }) ?? []
  )
}

const getTrackArtworkUploadHandles = async (
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
      const file = fileToSdk(t.metadata.artwork.file, 'artwork')
      const uploadHandle = sdk.tracks.uploadTrackFiles({
        imageFile: file,
        onProgress: (key, { loaded, total }) => {
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
        ...uploadHandle
      }
    })
}

const getTrackUploadHandles = async (
  context: Pick<QueryContextType, 'audiusSdk' | 'dispatch'>,
  tracks: TrackForUpload[]
) => {
  const sdk = await context.audiusSdk()
  return tracks.map((t) => {
    const handle = sdk.tracks.uploadTrackFiles({
      audioFile: fileToSdk(t.file, 'audio'),
      onProgress: (key, { loaded, total, transcode }) => {
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
      ...handle
    }
  })
}

export const useUpload = () => {
  const dispatch = useDispatch()
  const {
    audiusSdk,
    analytics: { make, track },
    reportToSentry
  } = useQueryContext()

  const { mutateAsync: uploadFiles } = useUploadFiles()
  const { mutateAsync: publishTracksAsync } = usePublishTracks()
  const { mutateAsync: publishCollectionAsync } = usePublishCollection()

  // Holds the upload promise so that uploading tracks can start immediately
  // and then be awaited on the finish step.
  const trackUploadPromise = useRef<ReturnType<typeof uploadFiles>>(
    Promise.resolve([])
  )

  // Tracks individual file uploads so they can be replaced if needed
  const fileUploads = useRef<
    Map<string, NonNullable<UploadFormState['tracks']>[number]['file']>
  >(new Map())

  // Tracks individual file upload handles so they can be aborted if needed
  const uploadHandles = useRef<
    Map<string, ReturnType<AudiusSdk['tracks']['uploadTrackFiles']>>
  >(new Map())

  const uploadTrackFiles = useCallback(
    async (tracks: TrackForUpload[]) => {
      // Track analytics for each track being uploaded
      tracks.forEach((t) => {
        fileUploads.current.set(t.clientId, t.file)
        track(
          make({
            eventName: Name.TRACK_UPLOAD_TRACK_UPLOADING,
            artworkSource:
              t.metadata.artwork && 'source' in t.metadata.artwork
                ? (t.metadata.artwork.source as 'unsplash' | 'original')
                : 'original',
            trackId: t.metadata.track_id!,
            genre: t.metadata.genre,
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

      const handles = await getTrackUploadHandles(
        { audiusSdk, dispatch },
        tracks
      )
      handles.forEach((handle, i) => {
        uploadHandles.current.set(tracks[i]!.clientId, handle)
      })
      return await uploadFiles({
        files: handles
      })
    },
    [audiusSdk, dispatch, make, track, uploadFiles]
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
          const existingFile = fileUploads.current.get(track.clientId)
          return existingFile && existingFile !== track.file
        }) ?? []

      // Abort and remove upload handles for removed or replaced files
      for (const key of uploadHandles.current.keys()) {
        const isRemoved = !tracks.find((t) => t.clientId === key)
        const isReplaced = !!tracksWithReplacedFiles.find(
          (t) => t.clientId === key
        )
        if (isRemoved || isReplaced) {
          uploadHandles.current.get(key)?.abort()
          uploadHandles.current.delete(key)
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
      return await uploadFiles({
        files: await getTrackArtworkUploadHandles(
          { audiusSdk, dispatch },
          tracks
        )
      })
    },
    [audiusSdk, dispatch, uploadFiles]
  )

  const uploadCollectionArtwork = useCallback(
    async (formState: CollectionFormState) => {
      if (
        !formState.metadata ||
        !formState.metadata.artwork ||
        !('file' in formState.metadata.artwork) ||
        !formState.metadata.artwork.file
      ) {
        return
      }
      const sdk = await audiusSdk()
      const uploadHandle = sdk.tracks.uploadTrackFiles({
        imageFile: fileToSdk(formState.metadata.artwork.file, 'artwork'),
        onProgress: (key, { loaded, total }) => {
          dispatch(
            uploadActions.updateProgress({
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
      return await uploadFiles({
        files: [
          {
            clientId: 'collection-artwork',
            ...uploadHandle
          }
        ]
      })
    },
    [audiusSdk, dispatch, uploadFiles]
  )

  const uploadStemFiles = useCallback(
    async (tracks: TrackForUpload[]) => {
      return await uploadFiles({
        files: await getStemUploadHandles({ audiusSdk, dispatch }, tracks)
      })
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
          } else if (uploadType === UploadType.INDIVIDUAL_TRACKS) {
            dispatch(uploadTracksSucceeded({ id: null }))
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
              const imageUploadResponse = artwork?.find(
                (a) => a.clientId === 'collection-artwork'
              )?.imageUploadResponse
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
        }
      }
    },
    [
      track,
      make,
      dispatch,
      replaceTrackFiles,
      uploadStemFiles,
      reportToSentry,
      uploadTrackArtworks,
      publishTracksAsync,
      uploadCollectionArtwork,
      publishCollectionAsync
    ]
  )

  return { startUpload, finishUpload }
}
