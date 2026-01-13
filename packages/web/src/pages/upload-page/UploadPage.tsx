import { useCallback, useEffect, useState } from 'react'

import {
  useCurrentAccountUser,
  usePublishCollection,
  usePublishTracks,
  useTrack,
  useUploadFiles
} from '@audius/common/api'
import { updateProgress } from '@audius/common/src/store/upload/actions'
import {
  uploadActions,
  UploadFormState,
  uploadSelectors,
  UploadType,
  useUploadConfirmationModal,
  TrackMetadataForUpload,
  type TrackForUpload,
  type CollectionFormState
} from '@audius/common/store'
import { IconCloudUpload } from '@audius/harmony'
import { HashId } from '@audius/sdk'
import type { UploadResponse } from '@audius/sdk/src/sdk/services/Storage/types'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router'

import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { EditFormScrollContext } from 'pages/edit-page/EditTrackPage'

import styles from './UploadPage.module.css'
import { EditPage } from './pages/EditPage'
import { FinishPage } from './pages/FinishPage'
import SelectPage from './pages/SelectPage'

const updateTrackMetadataWithUploadResponse = (
  trackMetadata: TrackMetadataForUpload,
  uploadResponse?: UploadResponse
): TrackMetadataForUpload => {
  if (!uploadResponse) return trackMetadata
  return {
    ...trackMetadata,
    track_cid: uploadResponse.results['320'],
    preview_cid:
      trackMetadata.preview_start_seconds !== undefined &&
      trackMetadata.preview_start_seconds !== null
        ? uploadResponse.results[
            `320_preview|${trackMetadata.preview_start_seconds}`
          ]
        : trackMetadata.preview_cid,
    orig_file_cid: uploadResponse.orig_file_cid,
    orig_filename: uploadResponse.orig_filename || trackMetadata.orig_filename,
    audio_upload_id: uploadResponse.id,
    duration: parseInt(uploadResponse.probe.format.duration, 10),
    bpm: uploadResponse.audio_analysis_results?.bpm
      ? parseFloat(uploadResponse.audio_analysis_results.bpm)
      : trackMetadata.bpm,
    musical_key: uploadResponse.audio_analysis_results?.key
      ? uploadResponse.audio_analysis_results.key
      : trackMetadata.musical_key,
    audio_analysis_error_count: uploadResponse.audio_analysis_error_count || 0
  }
}

const updateTrackArtworkWithUploadResponse = (
  trackMetadata: TrackMetadataForUpload,
  uploadResponse?: UploadResponse
): TrackMetadataForUpload => {
  if (!uploadResponse) return trackMetadata
  return {
    ...trackMetadata,
    cover_art_sizes: uploadResponse?.orig_file_cid
  }
}

const { updateFormState, reset, uploadTracksSucceeded, uploadTracksRequested } =
  uploadActions
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
  const initialMetadata = (location.state as LocationState)?.initialMetadata
  const formStateFromStore = useSelector(getFormState)
  const uploadSuccess = useSelector(getUploadSuccess)
  const uploadError = useSelector(getUploadError)
  const [formState, setFormState] = useState<UploadFormState>(
    formStateFromStore ?? initialFormState
  )
  const { data: user } = useCurrentAccountUser()
  const {
    data: trackUploadData,
    mutateAsync: uploadTrackFilesAsync,
    isSuccess: isTrackUploadSuccess
  } = useUploadFiles()
  const {
    data: artworkData,
    mutateAsync: uploadArtworkFilesAsync,
    isSuccess: isArtworkUploadSuccess
  } = useUploadFiles()
  const { mutateAsync: publishTracksAsync, isIdle: isPublishTracksIdle } =
    usePublishTracks()
  const {
    mutateAsync: publishCollectionAsync,
    isIdle: isPublishCollectionIdle
  } = usePublishCollection()

  const uploadTracks = useCallback(
    async (tracks: TrackForUpload[]) => {
      await uploadTrackFilesAsync({
        files: tracks.map((t) => {
          return {
            clientId: t.clientId,
            file: t.file as File,
            onProgress: (clientId, progress) => {
              dispatch(
                updateProgress({
                  clientId,
                  stemIndex: null,
                  key: 'audio',
                  progress
                })
              )
            },
            metadata: {
              filename: t.file.name ?? undefined,
              filetype: t.file.type ?? undefined,
              userWallet: user?.wallet,
              template: 'audio'
            }
          }
        })
      })
    },
    [dispatch, uploadTrackFilesAsync, user?.wallet]
  )

  const uploadTrackArtworks = useCallback(
    async (tracks: TrackForUpload[]) => {
      const files = await Promise.all(
        tracks
          .filter(
            (t) =>
              t.metadata?.artwork &&
              'file' in t.metadata.artwork &&
              t.metadata.artwork.file
          )
          .map(async (t) => {
            if (
              !t.metadata.artwork ||
              !('file' in t.metadata.artwork) ||
              !t.metadata.artwork?.file
            ) {
              throw new Error('No artwork file found')
            }
            const file =
              t.metadata.artwork.file instanceof Blob
                ? new File([t.metadata.artwork.file as Blob], 'artwork', {
                    type: t.metadata.artwork.file.type
                  })
                : t.metadata.artwork.file instanceof File
                  ? t.metadata.artwork.file
                  : new File(
                      [await (await fetch(t.metadata.artwork.file.uri)).blob()],
                      'artwork',
                      { type: 'image/jpeg' }
                    )
            return { clientId: t.clientId, file }
          })
      )
      await uploadArtworkFilesAsync({
        files: files
          .filter(({ file }) => file !== null)
          .map(({ clientId, file }) => ({
            clientId,
            file,
            onProgress: (clientId, progress) => {
              dispatch(
                updateProgress({
                  clientId,
                  stemIndex: null,
                  key: 'art',
                  progress
                })
              )
            },
            metadata: {
              filename: file.name ?? undefined,
              filetype: file.type ?? undefined,
              userWallet: user?.wallet,
              template: 'img_square'
            }
          }))
      })
    },
    [uploadArtworkFilesAsync, dispatch, user?.wallet]
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
      const file =
        formState.metadata.artwork.file instanceof Blob
          ? new File([formState.metadata.artwork.file as Blob], 'artwork', {
              type: formState.metadata.artwork.file.type
            })
          : formState.metadata.artwork.file instanceof File
            ? formState.metadata.artwork.file
            : new File(
                [
                  await (
                    await fetch(formState.metadata.artwork.file.uri)
                  ).blob()
                ],
                'artwork',
                { type: 'image/jpeg' }
              )
      await uploadArtworkFilesAsync({
        files: [
          {
            clientId: 'collection-artwork',
            file,
            onProgress: (clientId, progress) => {
              dispatch(
                updateProgress({
                  clientId,
                  stemIndex: null,
                  key: 'art',
                  progress
                })
              )
            },
            metadata: {
              filename: file.name ?? undefined,
              filetype: file.type ?? undefined,
              userWallet: user?.wallet,
              template: 'img_square'
            }
          }
        ]
      })
    },
    [uploadArtworkFilesAsync, dispatch, user?.wallet]
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
    (hasPublicTracks: boolean) => {
      openUploadConfirmationModal({
        hasPublicTracks,
        confirmCallback: () => {
          setPhase(Phase.FINISH)
        }
      })
    },
    [openUploadConfirmationModal]
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
            uploadTracks(formState.tracks ?? [])
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
              if (
                formState.uploadType === UploadType.INDIVIDUAL_TRACK ||
                formState.uploadType === UploadType.INDIVIDUAL_TRACKS
              ) {
                uploadTrackArtworks(formState.tracks ?? [])
              } else {
                uploadCollectionArtwork(formState as CollectionFormState)
              }
              openUploadConfirmation(hasPublicTracks && !isPrivateCollection)
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

  // When done uploading files and after confirming upload, publish the tracks or collection
  if (
    isTrackUploadSuccess &&
    isArtworkUploadSuccess &&
    isPublishTracksIdle &&
    isPublishCollectionIdle &&
    phase === Phase.FINISH &&
    formState.tracks &&
    trackUploadData &&
    artworkData
  ) {
    dispatch(uploadTracksRequested(formState))
    if (
      formState.uploadType === UploadType.INDIVIDUAL_TRACKS ||
      formState.uploadType === UploadType.INDIVIDUAL_TRACK
    ) {
      publishTracksAsync(
        formState.tracks!.map((t) => ({
          clientId: t.clientId,
          metadata: updateTrackMetadataWithUploadResponse(
            updateTrackArtworkWithUploadResponse(
              t.metadata,
              artworkData?.find((at) => at.clientId === t.clientId)?.response
            ),
            trackUploadData.find((ut) => ut.clientId === t.clientId)?.response
          ),
          onProgress: (clientId, progress) => {
            dispatch(
              updateProgress({
                clientId,
                stemIndex: null,
                key: 'audio',
                progress
              })
            )
          }
        }))
      ).then((res) => {
        if (formState.uploadType === UploadType.INDIVIDUAL_TRACK) {
          dispatch(uploadTracksSucceeded({ id: HashId.parse(res[0]!.trackId) }))
        } else if (formState.uploadType === UploadType.INDIVIDUAL_TRACKS) {
          dispatch(uploadTracksSucceeded({ id: null }))
        }
      })
    } else if (
      formState.uploadType === UploadType.ALBUM ||
      formState.uploadType === UploadType.PLAYLIST
    ) {
      publishCollectionAsync({
        collectionMetadata: formState.metadata,
        tracks: formState.tracks!.map((t) => ({
          clientId: t.clientId,
          metadata: updateTrackMetadataWithUploadResponse(
            updateTrackArtworkWithUploadResponse(
              t.metadata,
              artworkData?.[0]?.response // Collection artwork is first in the array
            ),
            trackUploadData.find((ut) => ut.clientId === t.clientId)?.response
          ),
          onProgress: (clientId, progress) => {
            dispatch(
              updateProgress({
                clientId,
                stemIndex: null,
                key: 'audio',
                progress
              })
            )
            dispatch(
              updateProgress({
                clientId,
                stemIndex: null,
                key: 'art',
                progress
              })
            )
          }
        }))
      }).then((collection) => {
        dispatch(
          uploadTracksSucceeded({ id: HashId.parse(collection.playlistId) })
        )
      })
    }
  }

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
