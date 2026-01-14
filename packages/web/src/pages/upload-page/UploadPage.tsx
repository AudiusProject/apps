import { useCallback, useEffect, useRef, useState } from 'react'

import { fileToSdk } from '@audius/common/adapters'
import {
  useCurrentAccountUser,
  usePublishCollection,
  usePublishTracks,
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
  type TrackFormState
} from '@audius/common/store'
import { IconCloudUpload } from '@audius/harmony'
import { HashId } from '@audius/sdk'
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
  const initialMetadata = (location.state as LocationState)?.initialMetadata
  const formStateFromStore = useSelector(getFormState)
  const uploadSuccess = useSelector(getUploadSuccess)
  const uploadError = useSelector(getUploadError)
  const [formState, setFormState] = useState<UploadFormState>(
    formStateFromStore ?? initialFormState
  )
  const { data: user } = useCurrentAccountUser()
  const { mutateAsync: uploadFiles } = useUploadFiles()
  const { mutateAsync: publishTracksAsync } = usePublishTracks()
  const { mutateAsync: publishCollectionAsync } = usePublishCollection()

  const trackUploadPromise = useRef<ReturnType<typeof uploadFiles>>(
    Promise.resolve([])
  )

  const uploadTracks = useCallback(
    async (tracks: TrackForUpload[]) => {
      // Track analytics for each track being uploaded
      tracks.forEach((t) => {
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

      return await uploadFiles({
        files: tracks.map((t) => ({
          clientId: t.clientId,
          file: fileToSdk(t.file, 'audio'),
          metadata: {
            filename: t.file.name ?? undefined,
            filetype: t.file.type ?? undefined,
            userWallet: user?.wallet,
            template: 'audio'
          }
        }))
      })
    },
    [dispatch, uploadFiles, user?.wallet]
  )

  const uploadTrackArtworks = useCallback(
    async (tracks: TrackForUpload[]) => {
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
            return {
              clientId: t.clientId,
              file,
              metadata: {
                filename: file.name ?? undefined,
                filetype: file.type ?? undefined,
                userWallet: user?.wallet,
                template: 'img_square'
              }
            }
          })
      })
    },
    [uploadFiles, user?.wallet]
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
      return await uploadFiles({
        files: [
          {
            clientId: 'collection-artwork',
            file: fileToSdk(formState.metadata.artwork.file, 'artwork'),
            metadata: {
              filename: 'artwork',
              filetype: formState.metadata.artwork.file.type ?? undefined,
              userWallet: user?.wallet,
              template: 'img_square'
            }
          }
        ]
      })
    },
    [uploadFiles, user?.wallet]
  )

  const uploadStemFiles = useCallback(
    (tracks: TrackForUpload[]) => {
      return uploadFiles({
        files: tracks.flatMap(
          (t) =>
            t.metadata.stems?.map((stemFile, index) => {
              const file = (stemFile as StemUploadWithFile).file
              return {
                clientId: t.clientId,
                stemIndex: index,
                file: fileToSdk(file, 'audio'),
                metadata: {
                  filename: file.name ?? undefined,
                  filetype: file.type ?? undefined,
                  userWallet: user?.wallet,
                  template: 'audio'
                }
              }
            }) ?? []
        )
      })
    },
    [uploadFiles, user?.wallet]
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
        // Upload stem files
        stems = await uploadStemFiles(formState.tracks ?? [])

        // Wait for track files to finish uploading before publishing
        tracks = await trackUploadPromise.current
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
          const publishRes = await publishTracksAsync(
            formState.tracks!.map((t) => ({
              clientId: t.clientId,
              metadata: t.metadata,
              audioUploadResponse: tracks.find(
                (ut) => ut.clientId === t.clientId
              )!.response,
              artUploadResponse: artworks.find(
                (a) => a.clientId === t.clientId
              )!.response,
              stemsUploadResponses: stems
                .filter((su) => su.clientId === t.clientId)
                .map((su) => su.response)
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
              const artResponse = artwork?.find(
                (a) => a.clientId === t.clientId
              )
              if (!artResponse) {
                throw new Error(`No artwork found for track ${t.clientId}`)
              }
              return {
                clientId: t.clientId,
                metadata: t.metadata,
                audioUploadResponse: tracks.find(
                  (ut) => ut.clientId === t.clientId
                )!.response,
                artUploadResponse: artResponse.response
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
              finishUpload(formState as CollectionFormState | TrackFormState)
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
