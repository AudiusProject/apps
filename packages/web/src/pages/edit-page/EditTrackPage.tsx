import { createContext } from 'react'

import { useStems, useTrackByParams } from '@audius/common/api'
import { SquareSizes, StemUpload, TrackMetadata } from '@audius/common/models'
import {
  TrackMetadataForUpload,
  cacheTracksActions,
  uploadActions,
  useReplaceTrackConfirmationModal,
  useReplaceTrackProgressModal
} from '@audius/common/store'
import { removeNullable } from '@audius/common/utils'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router'

import { EditTrackForm } from 'components/edit-track/EditTrackForm'
import { TrackEditFormValues } from 'components/edit-track/types'
import { Header } from 'components/header/desktop/Header'
import LoadingSpinnerFullPage from 'components/loading-spinner-full-page/LoadingSpinnerFullPage'
import Page from 'components/page/Page'
import { useIsUnauthorizedForHandleRedirect } from 'hooks/useManagedAccountNotAllowedRedirect'
import { useRequiresAccount } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { push } from 'utils/navigation'

const { editTrack } = cacheTracksActions

const { updateTrackAudio } = uploadActions

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
  useRequiresAccount()
  useIsUnauthorizedForHandleRedirect(handle ?? '')
  const { onOpen: openReplaceTrackConfirmation } =
    useReplaceTrackConfirmationModal()
  const { onOpen: openReplaceTrackProgress } = useReplaceTrackProgressModal()

  const { data: track, status: trackStatus } = useTrackByParams(params)

  const { data: stemTracks = [] } = useStems(track?.track_id)

  const onSubmit = (formValues: TrackEditFormValues) => {
    const metadata = { ...formValues.trackMetadatas[0] }
    const trackId = metadata.track_id
    if (!trackId) {
      console.error('Unexpected missing trackId')
      return
    }

    const replaceFile =
      'file' in formValues.tracks[0] ? formValues.tracks[0].file : null

    if (
      metadata.artwork &&
      'file' in metadata.artwork &&
      !metadata.artwork?.file
    ) {
      metadata.artwork = null
    }

    if (replaceFile) {
      openReplaceTrackConfirmation({
        confirmCallback: () => {
          dispatch(
            updateTrackAudio({
              trackId,
              file: replaceFile,
              metadata
            })
          )
          openReplaceTrackProgress()
        }
      })
    } else {
      dispatch(editTrack(trackId, metadata))
      dispatch(push(metadata.permalink))
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
