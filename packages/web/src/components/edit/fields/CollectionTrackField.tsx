import { useCallback, useContext, useEffect } from 'react'

import { TrackForEdit, TrackForUpload } from '@audius/common/store'
import {
  IconDrag,
  IconTrash,
  Text,
  IconButton,
  Flex,
  Switch
} from '@audius/harmony'
import { useField } from 'formik'

import { UploadPreviewContext } from 'components/edit-track/utils/uploadPreviewContext'
import { Tile } from 'components/tile'

import styles from './CollectionTrackField.module.css'
import { SelectGenreField } from './SelectGenreField'
import { SelectMoodField } from './SelectMoodField'
import { TrackNameField } from './TrackNameField'

const messages = {
  customize: 'Custom genre & mood',
  customizeDescription: 'Override the collection defaults for this track.'
}

type CollectionTrackFieldProps = {
  index: number
  remove: (index: number) => void
  disableDelete: boolean
}

type CollectionTrackWithOverride = (TrackForEdit | TrackForUpload) & {
  override: boolean
}

type TrackDetails = {
  genre?: string | null
  mood?: string | null
  tags?: string | null
}

export const CollectionTrackField = (props: CollectionTrackFieldProps) => {
  const { disableDelete = false, index, remove } = props
  const { playingPreviewIndex, stopPreview } = useContext(UploadPreviewContext)
  const [{ value: track }] = useField<CollectionTrackWithOverride>(
    `tracks.${index}`
  )

  const [{ value: metadata }, , { setValue }] = useField<
    CollectionTrackWithOverride['metadata']
  >(`tracks.${index}.metadata`)

  const [{ value: trackDetails }] = useField<TrackDetails>('trackDetails')
  const [{ value: isUpload }] = useField<boolean>('isUpload')
  const [, , { setValue: setOverride }] = useField<boolean>(
    `tracks.${index}.override`
  )

  // Per-track overrides are only offered at upload time. Tracks without an
  // override get an empty genre/mood, which the publish step fills in from
  // the collection's trackDetails.
  const { override } = track
  const isPreviewPlaying = playingPreviewIndex === index

  useEffect(() => {
    if (override) {
      // Start from the collection defaults so the artist only has to change
      // what differs for this track.
      setValue({
        ...metadata,
        genre: metadata.genre || trackDetails?.genre || '',
        mood: metadata.mood ?? trackDetails?.mood ?? null
      })
    } else {
      setValue({ ...metadata, genre: '', mood: null, tags: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override])

  const handleRemove = useCallback(() => {
    if (isPreviewPlaying) stopPreview()
    remove(index)
  }, [isPreviewPlaying, stopPreview, remove, index])

  const handleToggleOverride = useCallback(() => {
    setOverride(!override)
  }, [override, setOverride])

  return (
    <Tile className={styles.root} key={track.metadata.track_id} elevation='mid'>
      <div className={styles.trackNameRow}>
        <span className={styles.iconDrag}>
          <IconDrag color='default' />
        </span>
        <Text size='s'>{index + 1}</Text>
        {isUpload ? (
          <TrackNameField name={`tracks.${index}.metadata.title`} />
        ) : (
          <Flex w='100%' ml='s'>
            <Text size='l'>{track.metadata.title}</Text>
          </Flex>
        )}
        <IconButton
          size='m'
          color='subdued'
          icon={IconTrash}
          onClick={handleRemove}
          disabled={disableDelete}
          aria-label='Delete track'
        />
      </div>
      {isUpload ? (
        <div className={styles.overrideRow}>
          <Flex direction='column' gap='2xs'>
            <Text variant='title' size='s'>
              {messages.customize}
            </Text>
            <Text variant='body' size='s' color='subdued'>
              {messages.customizeDescription}
            </Text>
          </Flex>
          <Switch
            checked={!!override}
            onChange={handleToggleOverride}
            aria-label={`${messages.customize} for track ${index + 1}`}
          />
        </div>
      ) : null}
      {isUpload && override ? (
        <div className={styles.trackInformation}>
          <div className={styles.genreMood}>
            <SelectGenreField
              name={`tracks.${index}.metadata.genre`}
              datalistId={`genre-suggestions-track-${index}`}
              required={false}
            />
            <SelectMoodField name={`tracks.${index}.metadata.mood`} />
          </div>
        </div>
      ) : null}
    </Tile>
  )
}
