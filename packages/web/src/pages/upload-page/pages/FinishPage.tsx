import { useCallback, useMemo } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { imageBlank as placeholderArt } from '@audius/common/assets'
import { useUploadCompletionRoute } from '@audius/common/hooks'
import { Name } from '@audius/common/models'
import {
  uploadSelectors,
  UploadType,
  ProgressStatus,
  CommonState,
  ProgressState,
  TrackForUpload,
  TrackFormState,
  CollectionFormState
} from '@audius/common/store'
import {
  IconArrowRight as IconArrow,
  IconError,
  IconCloudUpload as IconUpload,
  IconValidationCheck,
  Text,
  PlainButton,
  ProgressBar
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'

import { make } from 'common/store/analytics/actions'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { Tile } from 'components/tile'

import { ShareBanner } from '../components/ShareBanner'

import styles from './FinishPage.module.css'

const { getCombinedUploadPercentage } = uploadSelectors

const messages = {
  uploadInProgress: 'Upload In Progress',
  uploadComplete: 'Upload Complete',
  uploadMore: 'Upload More',
  finishingUpload: 'Finalizing Upload',
  visitProfile: 'Visit Your Profile',
  visitTrack: 'Visit Track Page',
  visitAlbum: 'Visit Album Page',
  visitPlaylist: 'Visit Playlist Page'
}

const ProgressIndicator = (props: { status?: ProgressStatus }) => {
  const { status } = props

  switch (status) {
    case ProgressStatus.UPLOADING:
    case ProgressStatus.PROCESSING:
      return <LoadingSpinner className={styles.progressIndicator} />
    case ProgressStatus.COMPLETE:
      return <IconValidationCheck className={styles.progressIndicator} />
    case ProgressStatus.ERROR:
      return <IconError className={styles.progressIndicator} />
    default:
      return <div className={styles.emptyProgressIndicator} />
  }
}

type UploadTrackItemProps = {
  index: number
  displayIndex?: boolean
  displayArtwork?: boolean
  track: TrackForUpload
  trackProgress?: ProgressState
}

const UploadTrackItem = (props: UploadTrackItemProps) => {
  const {
    index,
    track,
    trackProgress,
    displayIndex = false,
    displayArtwork = false,
    ...otherProps
  } = props
  const artworkUrl =
    track.metadata.artwork && 'url' in track.metadata.artwork
      ? track.metadata.artwork?.url
      : null

  return (
    <div className={styles.uploadTrackItem} {...otherProps}>
      <ProgressIndicator status={trackProgress?.audio?.status} />
      {displayIndex ? <Text size='s'>{index + 1}</Text> : null}
      {displayArtwork ? (
        <DynamicImage
          wrapperClassName={styles.trackItemArtwork}
          image={artworkUrl || placeholderArt}
        />
      ) : null}
      <Text size='s'>{track.metadata.title}</Text>
    </div>
  )
}

type FinishPageProps = {
  formState: TrackFormState | CollectionFormState
  onContinue: () => void
}

export const FinishPage = (props: FinishPageProps) => {
  const { formState, onContinue } = props
  const { tracks, uploadType } = formState
  const upload = useSelector((state: CommonState) => state.upload)
  const { data: accountHandle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const fullUploadPercent = useSelector(getCombinedUploadPercentage)
  const dispatch = useDispatch()

  const uploadComplete = useMemo(() => {
    if (
      !upload.uploadProgress ||
      upload.uploading ||
      !upload.success ||
      upload.error
    )
      return false

    return upload.uploadProgress.reduce((acc, progress) => {
      return (
        acc &&
        (progress.art.status === ProgressStatus.COMPLETE ||
          progress.art.status === ProgressStatus.ERROR) &&
        (progress.audio.status === ProgressStatus.COMPLETE ||
          progress.audio.status === ProgressStatus.ERROR)
      )
    }, true)
  }, [upload])

  const handleUploadMoreClick = useCallback(() => {
    onContinue()
  }, [onContinue])

  const visitButtonText = useMemo(() => {
    switch (uploadType) {
      case UploadType.INDIVIDUAL_TRACK:
        return messages.visitTrack
      case UploadType.ALBUM:
        return messages.visitAlbum
      case UploadType.PLAYLIST:
        return messages.visitPlaylist
      default:
        if (!upload.tracks || upload.tracks.length > 1) {
          return messages.visitProfile
        } else {
          return messages.visitTrack
        }
    }
  }, [upload.tracks, uploadType])

  const visitButtonPath = useUploadCompletionRoute({
    uploadType,
    upload,
    accountHandle: accountHandle as string | null
  })

  const handleViewUpload = useCallback(() => {
    dispatch(make(Name.TRACK_UPLOAD_VIEW_TRACK_PAGE, { uploadType }))
    onContinue()
  }, [dispatch, uploadType, onContinue])

  const isUnlistedTrack =
    (upload.tracks &&
      upload.tracks.length === 1 &&
      upload.tracks[0].metadata.is_unlisted) ??
    false

  return (
    <div className={styles.page}>
      {uploadComplete ? (
        <ShareBanner
          uploadType={uploadType}
          isUnlistedTrack={isUnlistedTrack}
        />
      ) : null}
      <Tile className={styles.uploadProgress} elevation='mid'>
        <div className={styles.uploadHeader}>
          <div className={styles.headerInfo}>
            <Text id='upload-progress' variant='label' size='s'>
              {uploadComplete
                ? messages.uploadComplete
                : messages.uploadInProgress}
            </Text>
            <div className={styles.headerProgressInfo}>
              <Text variant='label' tag='p' size='s'>
                {uploadComplete
                  ? '100%'
                  : fullUploadPercent === 100 && !uploadComplete
                    ? messages.finishingUpload
                    : `${fullUploadPercent}%`}
              </Text>
              <ProgressIndicator
                status={
                  upload.error
                    ? ProgressStatus.ERROR
                    : uploadComplete
                      ? ProgressStatus.COMPLETE
                      : ProgressStatus.UPLOADING
                }
              />
            </div>
          </div>
          {!uploadComplete ? (
            <ProgressBar
              aria-labelledby='upload-progress'
              sliderClassName={styles.uploadProgressBar}
              value={fullUploadPercent}
            />
          ) : null}
        </div>
        <div className={styles.uploadTrackList}>
          {tracks.map((track, idx) => {
            const trackProgress = upload.uploadProgress?.[idx]
            return (
              <UploadTrackItem
                key={track.metadata.track_id}
                track={track}
                displayIndex={tracks.length > 1}
                index={idx}
                trackProgress={trackProgress}
                displayArtwork={
                  uploadType === UploadType.INDIVIDUAL_TRACK ||
                  uploadType === UploadType.INDIVIDUAL_TRACKS
                }
              />
            )
          })}
        </div>
        {uploadComplete && visitButtonPath ? (
          <div className={styles.uploadFooter}>
            <PlainButton onClick={handleUploadMoreClick} iconLeft={IconUpload}>
              {messages.uploadMore}
            </PlainButton>
            <PlainButton iconRight={IconArrow} onClick={handleViewUpload}>
              <Link to={visitButtonPath}>{visitButtonText}</Link>
            </PlainButton>
          </div>
        ) : null}
      </Tile>
    </div>
  )
}
