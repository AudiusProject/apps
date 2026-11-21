import { useCallback, useContext, useEffect } from 'react'

import { TrackForEdit, TrackForUpload } from '@audius/common/store'
import { IconDrag, IconTrash, Text, IconButton, Flex } from '@audius/harmony'
import { useField } from 'formik'

import { UploadPreviewContext } from 'components/edit-track/utils/uploadPreviewContext'
import { Tile } from 'components/tile'

import styles from './CollectionTrackField.module.css'
import { TrackNameField } from './TrackNameField'

type CollectionTrackFieldProps = {
  index: number
  remove: (index: number) => void
  disableDelete: boolean
}

type CollectionTrackWithOverride = (TrackForEdit | TrackForUpload) & {
  override: boolean
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

  const [{ value }] = useField('trackDetails')
  const [{ value: isUpload }] = useField<boolean>('isUpload')

  const { override } = track
  const isPreviewPlaying = playingPreviewIndex === index

  useEffect(() => {
    if (override) {
      setValue({ ...metadata, ...value })
    } else {
      setValue({ ...metadata, genre: '', mood: null, tags: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [override])

  const handleRemove = useCallback(() => {
    if (isPreviewPlaying) stopPreview()
    remove(index)
  }, [isPreviewPlaying, stopPreview, remove, index])

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
    </Tile>
  )
}
