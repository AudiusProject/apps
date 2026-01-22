import { useCallback, useEffect, useRef, useState } from 'react'

import { fileToSdk } from '@audius/common/adapters'
import {
  usePublishCollection,
  usePublishTracks,
  useQueryContext,
  useTrack,
  useUploadFiles
} from '@audius/common/api'
import type { StemUploadWithFile } from '@audius/common/models'
import { Feature, isContentFollowGated, Name } from '@audius/common/models'
import {
  uploadActions,
  UploadFormState,
  uploadSelectors,
  UploadType,
  useUploadConfirmationModal,
  TrackMetadataForUpload,
  type TrackForUpload,
  type CollectionFormState,
  type TrackFormState,
  ProgressStatus
} from '@audius/common/store'
import { HashId, type AudiusSdk } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router'

import { make } from 'common/store/analytics/actions'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { EditFormScrollContext } from 'pages/edit-page/EditTrackPage'
import { reportToSentry } from 'store/errors/reportToSentry'

import styles from './UploadPage.module.css'
import { EditPage } from './pages/EditPage'
import { FinishPage } from './pages/FinishPage'
import SelectPage from './pages/SelectPage'

const {
  updateFormState,
  reset,
  uploadTracksSucceeded,
  uploadTracksRequested,
  uploadTracksFailed
} = uploadActions
const { getFormState, getUploadSuccess, getUploadError } = uploadSelectors

const messages = {
  selectPageTitle: 'Upload Your Music',
  editPageTitle: 'Complete Your ',
  finishPageTitle: 'Uploading Your '
}

enum Phase {
  SELECT,
  EDIT,
  FINISH
}

const uploadTypeStringMap: Record<UploadType, string> = {
  [UploadType.INDIVIDUAL_TRACK]: 'Track',
  [UploadType.INDIVIDUAL_TRACKS]: 'Tracks',
  [UploadType.ALBUM]: 'Album',
  [UploadType.PLAYLIST]: 'Playlist'
}

const initialFormState: UploadFormState = {
  uploadType: undefined,
  metadata: undefined,
  tracks: undefined
}

type UploadPageProps = {
  scrollToTop: () => void
}

type LocationState = {
  initialMetadata?: Partial<TrackMetadataForUpload>
}

export const UploadPage = (props: UploadPageProps) => {
  const { scrollToTop } = props
  const dispatch = useDispatch()
  const location = useLocation()
  const { audiusSdk } = useQueryContext()
  const initialMetadata = (location.state as LocationState)?.initialMetadata
  const formStateFromStore = useSelector(getFormState)
  const uploadSuccess = useSelector(getUploadSuccess)
  const uploadError = useSelector(getUploadError)
  const [formState, setFormState] = useState<UploadFormState>(
    formStateFromStore ?? initialFormState
  )
  const { mutateAsync: uploadFiles } = useUploadFiles()
  const { mutateAsync: publishTracksAsync } = usePublishTracks()
  const { mutateAsync: publishCollectionAsync } = usePublishCollection()

  const trackUploadPromise = useRef<ReturnType<typeof uploadFiles>>(
    Promise.resolve([])
  )

  const fileUploads = useRef<
    Map<string, NonNullable<UploadFormState['tracks']>[number]['file']>
  >(new Map())

  const uploadHandles = useRef<
    Map<string, ReturnType<AudiusSdk['tracks']['uploadTrackFiles']>>
  >(new Map())

  const uploadTracks = useCallback(
    async (tracks: TrackForUpload[]) => {
      // Track analytics for each track being uploaded
      tracks.forEach((t) => {
        fileUploads.current.set(t.clientId, t.file)
        dispatch(
          make(Name.TRACK_UPLOAD_TRACK_UPLOADING, {
            artworkSource:
              t.metadata.artwork && 'source' in t.metadata.artwork
                ? t.metadata.artwork.source
                : undefined,
            trackId: t.metadata.track_id,
            genre: t.metadata.genre,
            mood: t.metadata.mood,
            size: t.file.size,
            fileType: t.file.type,
            name: t.file.name,
            downloadable: isContentFollowGated(t.metadata.download_conditions)
              ? 'follow'
              : t.metadata.is_downloadable
                ? 'yes'
                : 'no'
          })
        )
      })

      const sdk = await audiusSdk?.()
      return await uploadFiles({
        files: tracks.map((t) => {
          const handle = sdk.tracks.uploadTrackFiles({
            audioFile: fileToSdk(t.file, 'audio'),
            onProgress: (key, { loaded, total, transcode }) => {
              dispatch(
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
          uploadHandles.current.set(t.clientId, handle)
          return {
            clientId: t.clientId,
            ...handle
          }
        })
      })
    },
    [audiusSdk, dispatch, uploadFiles]
  )

  /**
   * Replace track files that have been changed in the edit form
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
          uploadTracks(tracksWithReplacedFiles),
          trackUploadPromise.current
        ]).then(([newUploads, oldUploads]) => [
          ...newUploads,
          ...oldUploads.filter((oldUpload) => {
            return !newUploads.find((nu) => nu.clientId === oldUpload.clientId)
          })
        ])
      }
    },
    [uploadTracks]
  )

  const uploadTrackArtworks = useCallback(
    async (tracks: TrackForUpload[]) => {
      const sdk = await audiusSdk()
      return await uploadFiles({
        files: tracks
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
                dispatch(
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
      const sdk = await audiusSdk()
      return await uploadFiles({
        files: tracks.flatMap(
          (t) =>
            t.metadata.stems?.map((stemFile, index) => {
              const file = (stemFile as StemUploadWithFile).file
              const uploadHandle = sdk.tracks.uploadTrackFiles({
                audioFile: fileToSdk(file, 'audio'),
                onProgress: (key, { loaded, total, transcode }) => {
                  dispatch(
                    uploadActions.updateProgress({
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
      })
    },
    [audiusSdk, dispatch, uploadFiles]
  )

  const finishUpload = useCallback(
    async (formState: CollectionFormState | TrackFormState) => {
      const kind = (() => {
        switch (formState.uploadType) {
          case UploadType.ALBUM:
            return 'album'
          case UploadType.PLAYLIST:
            return 'playlist'
          default:
            return 'tracks'
        }
      })()

      // Track start of upload
      dispatch(
        make(Name.TRACK_UPLOAD_START_UPLOADING, {
          count: formState.tracks?.length ?? 0,
          kind
        })
      )

      dispatch(uploadTracksRequested(formState))

      let stems = []
      let tracks = []
      try {
        // Wait for stems and tracks to upload before publishing
        ;[stems, tracks] = await Promise.all([
          uploadStemFiles(formState.tracks ?? []),
          trackUploadPromise.current
        ])
      } catch (err) {
        console.error('Error uploading files:', err)
        dispatch(make(Name.TRACK_UPLOAD_FAILURE, { kind }))
        await reportToSentry({
          error: err as Error,
          name: 'Upload: File Upload Failed',
          additionalInfo: {
            tracks: formState.tracks?.map((t) => ({
              title: t.metadata.title,
              stemCount: t.metadata.stems?.length ?? 0
            }))
          },
          feature: Feature.Upload
        })
        dispatch(uploadTracksFailed())
        return
      }

      if (
        formState.uploadType === UploadType.INDIVIDUAL_TRACKS ||
        formState.uploadType === UploadType.INDIVIDUAL_TRACK
      ) {
        try {
          const artworks = await uploadTrackArtworks(formState.tracks ?? [])
          const mappedImages = artworks.reduce(
            (acc, art) => {
              acc[art.clientId] = art
              return acc
            },
            {} as Record<string, (typeof artworks)[number]>
          )
          const mappedTracks = tracks.reduce(
            (acc, track) => {
              acc[track.clientId] = track
              return acc
            },
            {} as Record<string, (typeof tracks)[number]>
          )
          if (
            formState.tracks!.some(
              (t) => !mappedTracks[t.clientId]?.audioUploadResponse
            )
          ) {
            throw new Error(
              'Missing audio upload response for one or more tracks'
            )
          }
          if (
            formState.tracks!.some(
              (t) =>
                t.metadata.artwork &&
                !mappedImages[t.clientId]?.imageUploadResponse
            )
          ) {
            throw new Error(
              'Missing artwork upload response for one or more tracks'
            )
          }
          const publishRes = await publishTracksAsync(
            formState.tracks!.map((t) => ({
              clientId: t.clientId,
              metadata: t.metadata,
              audioUploadResponse:
                mappedTracks[t.clientId]!.audioUploadResponse!,
              imageUploadResponse:
                mappedImages[t.clientId]!.imageUploadResponse!,
              stemsUploadResponses: stems
                .filter(
                  (su) => su.clientId === t.clientId && su.audioUploadResponse
                )
                .map((su) => su.audioUploadResponse!)
            }))
          )

          // Track complete upload analytics
          dispatch(
            make(Name.TRACK_UPLOAD_COMPLETE_UPLOAD, {
              trackCount: formState.tracks?.length ?? 0,
              kind
            })
          )

          if (formState.uploadType === UploadType.INDIVIDUAL_TRACK) {
            dispatch(
              uploadTracksSucceeded({
                id: HashId.parse(publishRes[0]!.trackId)
              })
            )
          } else if (formState.uploadType === UploadType.INDIVIDUAL_TRACKS) {
            dispatch(uploadTracksSucceeded({ id: null }))
          }
        } catch (err) {
          console.error('Error publishing tracks:', err)
          dispatch(make(Name.TRACK_UPLOAD_FAILURE, { kind }))
          await reportToSentry({
            error: err as Error,
            name: 'Upload: Track Publishing Failed',
            additionalInfo: {
              tracks: formState.tracks?.map((t) => ({
                title: t.metadata.title,
                hasArtwork: !!t.metadata.artwork
              }))
            },
            feature: Feature.Upload
          })
          dispatch(uploadTracksFailed())
        }
      } else if (
        formState.uploadType === UploadType.ALBUM ||
        formState.uploadType === UploadType.PLAYLIST
      ) {
        try {
          const artwork = await uploadCollectionArtwork(
            formState as CollectionFormState
          )
          const publishRes = await publishCollectionAsync({
            collectionMetadata: formState.metadata,
            tracks: formState.tracks!.map((t) => {
              const artUploadResponse = artwork?.find(
                (a) => a.clientId === t.clientId
              )?.imageUploadResponse
              if (!artUploadResponse) {
                throw new Error(`No artwork found for track ${t.clientId}`)
              }
              const audioUploadResponse = tracks.find(
                (ut) => ut.clientId === t.clientId
              )!.audioUploadResponse
              if (!audioUploadResponse) {
                throw new Error(`No audio found for track ${t.clientId}`)
              }
              return {
                clientId: t.clientId,
                metadata: t.metadata,
                audioUploadResponse,
                artUploadResponse
              }
            })
          })

          // Track complete upload analytics
          dispatch(
            make(Name.TRACK_UPLOAD_COMPLETE_UPLOAD, {
              trackCount: formState.tracks?.length ?? 0,
              kind
            })
          )

          dispatch(
            uploadTracksSucceeded({ id: HashId.parse(publishRes.playlistId) })
          )
        } catch (err) {
          console.error('Error publishing collection:', err)
          dispatch(
            make(Name.TRACK_UPLOAD_FAILURE, {
              kind:
                formState.uploadType === UploadType.ALBUM ? 'album' : 'playlist'
            })
          )
          await reportToSentry({
            error: err as Error,
            name: 'Upload: Collection Publishing Failed',
            additionalInfo: {
              collectionType: formState.uploadType,
              trackCount: formState.tracks?.length,
              tracks: formState.tracks?.map((t) => ({
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
      dispatch,
      uploadStemFiles,
      uploadCollectionArtwork,
      uploadTrackArtworks,
      publishTracksAsync,
      publishCollectionAsync
    ]
  )

  // For navigating back to a remix contest page
  const { data: originalTrack } = useTrack(
    initialMetadata?.remix_of?.tracks[0].parent_track_id
  )
  const navigate = useNavigateToPage()

  // Start the user on the finish page if they have a form state
  const [phase, setPhase] = useState(
    formStateFromStore ? Phase.FINISH : Phase.SELECT
  )

  // Clean up the store on unmount only if the upload succeeded or failed
  // Allow users to resume in progress uploads otherwise.
  useEffect(() => {
    return () => {
      if (uploadSuccess || uploadError) {
        dispatch(reset())
      }
    }
  }, [uploadSuccess, uploadError, dispatch])

  const { tracks, uploadType } = formState

  const pageTitleUploadType =
    !uploadType ||
    (uploadType === UploadType.INDIVIDUAL_TRACKS && tracks?.length === 1)
      ? UploadType.INDIVIDUAL_TRACK
      : uploadType

  let pageTitle = messages.selectPageTitle
  switch (phase) {
    case Phase.EDIT:
      pageTitle = `${messages.editPageTitle}${uploadTypeStringMap[pageTitleUploadType]}`
      break
    case Phase.FINISH:
      pageTitle = `${messages.finishPageTitle}${uploadTypeStringMap[pageTitleUploadType]}`
      break
    case Phase.SELECT:
    default:
      pageTitle = messages.selectPageTitle
  }

  const { onOpen: openUploadConfirmationModal } = useUploadConfirmationModal()

  const openUploadConfirmation = useCallback(
    (
      hasPublicTracks: boolean,
      formState: CollectionFormState | TrackFormState
    ) => {
      openUploadConfirmationModal({
        hasPublicTracks,
        confirmCallback: () => {
          setPhase(Phase.FINISH)
          replaceTrackFiles(formState.tracks ?? [])
          finishUpload(formState)
        }
      })
    },
    [finishUpload, openUploadConfirmationModal, replaceTrackFiles]
  )

  let page
  switch (phase) {
    case Phase.SELECT:
      page = (
        <SelectPage
          formState={formState}
          initialMetadata={initialMetadata}
          onContinue={(formState: UploadFormState) => {
            setFormState(formState)
            setPhase(Phase.EDIT)
            trackUploadPromise.current = uploadTracks(formState.tracks ?? [])
          }}
        />
      )
      break
    case Phase.EDIT:
      if (formState.uploadType !== undefined) {
        page = (
          <EditPage
            formState={formState}
            initialMetadata={initialMetadata}
            onContinue={(formState: UploadFormState) => {
              setFormState(formState)
              dispatch(updateFormState(formState))
              const isPrivateCollection =
                'metadata' in formState && formState.metadata?.is_private
              const hasPublicTracks =
                formState.tracks?.some(
                  (track) => !track.metadata.is_unlisted
                ) ?? true
              openUploadConfirmation(
                hasPublicTracks && !isPrivateCollection,
                formState as CollectionFormState | TrackFormState
              )
            }}
          />
        )
      }
      break
    case Phase.FINISH:
      if (formState.uploadType !== undefined) {
        page = (
          <FinishPage
            formState={formState}
            onContinue={() => {
              setFormState({
                tracks: undefined,
                uploadType: undefined,
                metadata: undefined
              })
              setPhase(Phase.SELECT)
              dispatch(reset())
            }}
          />
        )
      }
  }

  const handleBack = useCallback(() => {
    if (phase === Phase.EDIT && originalTrack) {
      navigate(originalTrack.permalink)
    } else {
      setPhase(Phase.SELECT)
    }
  }, [phase, originalTrack, navigate])

  return (
    <Page
      title='Upload'
      description='Upload and publish audio content to the Audius platform'
      contentClassName={styles.upload}
      header={
        <Header
          icon={IconCloudUpload}
          primary={pageTitle}
          showBackButton={phase === Phase.EDIT}
          onClickBack={handleBack}
        />
      }
    >
      <EditFormScrollContext.Provider value={scrollToTop}>
        {page}
      </EditFormScrollContext.Provider>
    </Page>
  )
}
