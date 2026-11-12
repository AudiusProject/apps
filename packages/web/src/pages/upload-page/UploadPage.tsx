import { useCallback, useEffect, useState } from 'react'

import { useCurrentUserId, useTrack, useUpload } from '@audius/common/api'
import {
  uploadActions,
  UploadFormState,
  uploadSelectors,
  UploadType,
  useUploadConfirmationModal,
  TrackMetadataForUpload,
  type CollectionFormState,
  type TrackFormState,
  toastActions
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { IconCloudUpload, IconArrowRight } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router'

import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { EditFormScrollContext } from 'pages/edit-page/EditTrackPage'

import styles from './UploadPage.module.css'
import { UploadDraftBanner } from './components/UploadDraftBanner'
import { EditPage } from './pages/EditPage'
import { FinishPage } from './pages/FinishPage'
import SelectPage from './pages/SelectPage'
import {
  clearUploadDraft,
  draftToFormState,
  loadUploadDraft,
  UploadDraft
} from './store/utils/uploadDraft'

const { reset } = uploadActions
const { toast } = toastActions
const { getFormState, getUploadSuccess, getUploadError } = uploadSelectors
const { UPLOAD_PAGE } = route

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

  const handleUploadSuccess = useCallback(() => {
    if (window.location.pathname !== UPLOAD_PAGE) {
      dispatch(
        toast({
          content: 'Your upload is complete!',
          link: UPLOAD_PAGE,
          linkText: 'View',
          leftIcon: IconCloudUpload,
          rightIcon: IconArrowRight
        })
      )
    }
  }, [dispatch])

  const handleUploadError = useCallback(() => {
    if (window.location.pathname !== UPLOAD_PAGE) {
      dispatch(
        toast({
          content: 'An error occurred during upload.',
          link: UPLOAD_PAGE,
          linkText: 'View',
          leftIcon: IconCloudUpload,
          rightIcon: IconArrowRight
        })
      )
    }
  }, [dispatch])

  const { startUpload, finishUpload } = useUpload(
    handleUploadSuccess,
    handleUploadError
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

  // Offer to resume a saved draft when starting fresh.
  const { data: currentUserId } = useCurrentUserId()
  const [draft, setDraft] = useState<UploadDraft | null>(null)
  useEffect(() => {
    if (!currentUserId || formStateFromStore) return
    let cancelled = false
    loadUploadDraft(currentUserId)
      .then((loaded) => {
        if (!cancelled) setDraft(loaded)
      })
      .catch((e) => console.warn('Unable to load upload draft', e))
    return () => {
      cancelled = true
    }
  }, [currentUserId, formStateFromStore])

  const handleResumeDraft = useCallback(() => {
    if (!draft) return
    const draftFormState = draftToFormState(draft)
    setDraft(null)
    setFormState(draftFormState)
    setPhase(Phase.EDIT)
    startUpload(draftFormState as CollectionFormState | TrackFormState)
  }, [draft, startUpload])

  const handleDiscardDraft = useCallback(() => {
    setDraft(null)
    if (currentUserId) clearUploadDraft(currentUserId)
  }, [currentUserId])

  // Once publishing starts the draft has done its job. This runs after the
  // edit form unmounts, so its final autosave is queued before the clear.
  useEffect(() => {
    if (phase === Phase.FINISH && currentUserId) {
      clearUploadDraft(currentUserId)
    }
  }, [phase, currentUserId])

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
          finishUpload(formState)
        }
      })
    },
    [finishUpload, openUploadConfirmationModal]
  )

  let page
  switch (phase) {
    case Phase.SELECT:
      page = (
        <>
          {draft ? (
            <UploadDraftBanner
              draft={draft}
              onResume={handleResumeDraft}
              onDiscard={handleDiscardDraft}
            />
          ) : null}
          <SelectPage
            formState={formState}
            initialMetadata={initialMetadata}
            onContinue={(formState: UploadFormState) => {
              setFormState(formState)
              setPhase(Phase.EDIT)
              startUpload(formState as CollectionFormState | TrackFormState)
            }}
          />
        </>
      )
      break
    case Phase.EDIT:
      if (formState.uploadType !== undefined) {
        page = (
          <EditPage
            formState={formState}
            onContinue={(formState: UploadFormState) => {
              setFormState(formState)
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
