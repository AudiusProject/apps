import { useCallback } from 'react'

import { TrackForUpload, UploadType } from '@audius/common/store'
import {
  Button,
  SegmentedControl,
  Scrollbar,
  IconCaretRight,
  Text
} from '@audius/harmony'
import cn from 'classnames'

import { TrackPreview } from 'components/upload/TrackPreview'

import styles from './TracksPreview.module.css'

const messages = {
  continue: 'Continue Uploading',
  releaseType: 'Release Type',
  trackAdded: 'Track Added',
  tracksAdded: 'Tracks Added'
}

type TracksPreviewProps = {
  uploadType: UploadType
  tracks: TrackForUpload[]
  setUploadType: (uploadType: UploadType) => void
  onRemove: (index: number) => void
  onContinue: () => void
}

const uploadDescriptions = {
  [UploadType.PLAYLIST]:
    'Create a playlist from your tracks. You can easily modify this playlist later, even adding tracks from other artists.',
  [UploadType.ALBUM]:
    'Upload your songs into an album. Albums can only include your own tracks.',
  [UploadType.INDIVIDUAL_TRACKS]:
    'Upload single tracks. Each appears separately.',
  [UploadType.INDIVIDUAL_TRACK]:
    'Upload single tracks. Each appears separately.'
}

export const TracksPreview = (props: TracksPreviewProps) => {
  const { onContinue, onRemove, tracks, uploadType, setUploadType } = props

  const handleOptionSelect = useCallback(
    (option: string) => {
      setUploadType(Number(option))
    },
    [setUploadType]
  )

  return (
    <div className={styles.root}>
      <div className={cn(styles.info, styles.header)}>
        <Text variant='label' size='s'>
          {messages.releaseType}
        </Text>
        <SegmentedControl
          label={messages.releaseType}
          onSelectOption={handleOptionSelect}
          selected={String(
            uploadType === UploadType.INDIVIDUAL_TRACK
              ? UploadType.INDIVIDUAL_TRACKS
              : uploadType
          )}
          options={[
            { key: String(UploadType.INDIVIDUAL_TRACKS), text: 'Tracks' },
            { key: String(UploadType.ALBUM), text: 'Album' },
            { key: String(UploadType.PLAYLIST), text: 'Playlist' }
          ]}
          // Matches 0.18s entry animation
          forceRefreshAfterMs={180}
        />
        <Text variant='body'>{uploadDescriptions[props.uploadType]}</Text>
      </div>
      <Scrollbar
        className={cn(styles.tracks, {
          [styles.shortScroll]:
            props.uploadType !== UploadType.INDIVIDUAL_TRACKS
        })}
      >
        {tracks.map((track, i) => (
          <TrackPreview
            index={i}
            displayIndex={tracks.length > 1}
            key={`track-preview-${i}`}
            onRemove={() => onRemove(i)}
            file={track.file as File}
          />
        ))}
      </Scrollbar>
      <div className={cn(styles.info, styles.footer)}>
        <Text variant='body' size='s'>
          {`${tracks.length} ${
            tracks.length === 1 ? messages.trackAdded : messages.tracksAdded
          }`}
        </Text>
        <Button
          variant='primary'
          name='continue'
          iconRight={IconCaretRight}
          onClick={onContinue}
        >
          {messages.continue}
        </Button>
      </div>
    </div>
  )
}
