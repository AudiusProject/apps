import { createContext } from 'react'

import { fileToSdk } from '@audius/common/adapters'
import { useStems, useTrackByParams, useUpdateTrack } from '@audius/common/api'
import { SquareSizes, StemUpload, TrackMetadata } from '@audius/common/models'
import {
  TrackMetadataForUpload,
  replaceTrackProgressModalActions,
  useReplaceTrackConfirmationModal,
  useReplaceTrackProgressModal
} from '@audius/common/store'
import { removeNullable } from '@audius/common/utils'
import { useDispatch } from 'react-redux'
import { useNavigate, useParams } from 'react-router'

import { EditTrackForm } from 'components/edit-track/EditTrackForm'
import { TrackEditFormValues } from 'components/edit-track/types'
import { Header } from 'components/header/desktop/Header'
import LoadingSpinnerFullPage from 'components/loading-spinner-full-page/LoadingSpinnerFullPage'
import Page from 'components/page/Page'
import { useIsUnauthorizedForHandleRedirect } from 'hooks/useManagedAccountNotAllowedRedirect'
import { useRequiresAccount } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

const messages = {
  title: 'Edit Your Track'
}

type EditPageProps = {
  scrollToTop: () => void
}

export const EditFormScrollContext = createContext(() => {})

export const EditTrackPage = (props: EditPageProps) => {
  const { scrollToTop } = props
  const params = useParams<{ handle?: string; slug?: string }>()
  const { handle } = params
  const dispatch = useDispatch()
  const navigate = useNavigate()
  useRequiresAccount()
  useIsUnauthorizedForHandleRedirect(handle ?? '')
  const { onOpen: openReplaceTrackConfirmation } =
    useReplaceTrackConfirmationModal()
  const {
    onOpen: openReplaceTrackProgress,
    onClose: closeReplaceTrackProgress
  } = useReplaceTrackProgressModal()
  const { mutateAsync: updateTrack } = useUpdateTrack()

  const { data: track, status: trackStatus } = useTrackByParams(params)

  const { data: stemTracks = [] } = useStems(track?.track_id)

  const onSubmit = (formValues: TrackEditFormValues) => {
    const metadata = { ...formValues.trackMetadatas[0] }
    const trackId = metadata.track_id
    if (!trackId) {
      console.error('Unexpected missing trackId')
      return
    }

    // Extract the audio file if present
    const audioFile =
      'file' in formValues.tracks[0] ? formValues.tracks[0].file : undefined

    // Extract the cover art file if present
    const imageFile =
      metadata.artwork && 'file' in metadata.artwork && metadata.artwork.file
        ? fileToSdk(metadata.artwork.file, 'cover_art')
        : undefined

    const editAndNavigate = async () => {
      try {
        await updateTrack({
          trackId,
          metadata,
          audioFile,
          imageFile,
          onProgress: (type, progress) => {
            if (type !== 'audio') return
            dispatch(
              replaceTrackProgressModalActions.set({
                ...progress,
                error: false
              })
            )
          }
        })
        navigate(metadata.permalink)
      } catch (err) {
        dispatch(
          replaceTrackProgressModalActions.set({
            error: true,
            loaded: 0,
            total: 0,
            transcode: 0
          })
        )
      }
    }

    if (audioFile && audioFile instanceof File) {
      openReplaceTrackConfirmation({
        confirmCallback: async () => {
          openReplaceTrackProgress()
          await editAndNavigate()
          closeReplaceTrackProgress()
        }
      })
    } else {
      editAndNavigate()
    }
  }

  const coverArtUrl = useTrackCoverArt({
    trackId: track?.track_id,
    size: SquareSizes.SIZE_1000_BY_1000
  })

  const stemsAsUploads: StemUpload[] = stemTracks
    .map((stemTrack) => {
      return {
        metadata: stemTrack,
        category: stemTrack.stem_of.category,
        allowCategorySwitch: false,
        allowDelete: true
      }
    })
    .filter(removeNullable)

  const trackAsMetadataForUpload: TrackMetadataForUpload = {
    ...(track as TrackMetadata),
    mood: track?.mood || null,
    artwork: {
      url: coverArtUrl || ''
    },
    stems: stemsAsUploads
  }

  const initialValues: TrackEditFormValues = {
    tracks: [
      {
        metadata: trackAsMetadataForUpload
      }
    ],
    trackMetadatas: [trackAsMetadataForUpload],
    trackMetadatasIndex: 0
  }

  return (
    <Page
      title={messages.title}
      header={<Header primary={messages.title} showBackButton />}
    >
      {trackStatus !== 'success' || !coverArtUrl ? (
        <LoadingSpinnerFullPage />
      ) : (
        <EditFormScrollContext.Provider value={scrollToTop}>
          <EditTrackForm initialValues={initialValues} onSubmit={onSubmit} />
        </EditFormScrollContext.Provider>
      )}
    </Page>
  )
}
