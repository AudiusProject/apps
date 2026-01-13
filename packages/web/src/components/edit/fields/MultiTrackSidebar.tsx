import { MouseEvent, useCallback, useContext } from 'react'

import { imageBlank as placeholderArt } from '@audius/common/assets'
import {
  Button,
  IconTrash,
  IconError,
  IconCloudUpload,
  Text,
  useTheme,
  IconButton
} from '@audius/harmony'
import cn from 'classnames'
import { useField, useFormikContext } from 'formik'
import { isEmpty } from 'lodash'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import { useIndexedField } from 'components/edit-track/hooks'
import {
  SingleTrackEditValues,
  TrackEditFormValues
} from 'components/edit-track/types'
import { UploadPreviewContext } from 'components/edit-track/utils/uploadPreviewContext'
import layoutStyles from 'components/layout/layout.module.css'
import { EditFormScrollContext } from 'pages/edit-page/EditTrackPage'

import styles from './MultiTrackSidebar.module.css'

const messages = {
  title: 'UPLOADED TRACKS',
  complete: 'Complete Upload',
  fixErrors: 'Fix errors to complete your upload.',
  titleRequired: 'Track name required',
  removeTrack: 'Remove track'
}

export const MultiTrackSidebar = () => {
  const scrollToTop = useContext(EditFormScrollContext)
  const { errors, submitCount } = useFormikContext<TrackEditFormValues>()
  const [{ value: tracks }] =
    useField<TrackEditFormValues['trackMetadatas']>('trackMetadatas')
  const { spacing } = useTheme()

  return (
    <div className={styles.root}>
      <div className={cn(layoutStyles.col)}>
        <div className={styles.title}>
          <Text variant='label' size='s'>
            {messages.title}
          </Text>
        </div>
        <div className={cn(styles.body, layoutStyles.col, layoutStyles.gap2)}>
          <div className={cn(styles.tracks, layoutStyles.col)}>
            {tracks.map((_, i) => (
              <TrackRow key={i} index={i} />
            ))}
          </div>
          <div className={styles.completeButton}>
            <Button
              onClick={scrollToTop}
              variant='primary'
              iconRight={IconCloudUpload}
              type='submit'
              fullWidth
            >
              {messages.complete}
            </Button>
          </div>
          {!isEmpty(errors) && submitCount > 0 ? (
            <div className={cn(layoutStyles.row, layoutStyles.gap1)}>
              <IconError
                size='xs'
                color='danger'
                css={{ margin: spacing.unit1 }}
              />
              <Text variant='body' size='xs' color='danger'>
                {messages.fixErrors}
              </Text>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

type TrackRowProps = {
  index: number
}

const TrackRow = (props: TrackRowProps) => {
  const { index } = props
  const scrollToTop = useContext(EditFormScrollContext)
  const { spacing } = useTheme()
  const { values, setValues, errors, submitCount } =
    useFormikContext<TrackEditFormValues>()
  const { playingPreviewIndex, stopPreview } = useContext(UploadPreviewContext)
  const [{ value: title }] = useIndexedField<SingleTrackEditValues['title']>(
    'trackMetadatas',
    index,
    'title'
  )
  const [{ value: artworkUrl }] = useIndexedField<string>(
    `trackMetadatas`,
    index,
    'artwork.url'
  )
  const [{ value: selectedIndex }, , { setValue: setIndex }] = useField(
    'trackMetadatasIndex'
  )
  const isSelected = index === selectedIndex

  const handleClickTrack = useCallback(
    (index: number) => {
      setIndex(index)
      scrollToTop()
    },
    [scrollToTop, setIndex]
  )

  const handleRemoveTrack = useCallback(
    (e: MouseEvent<HTMLButtonElement>, index: number) => {
      if (index === playingPreviewIndex) stopPreview()

      e.stopPropagation()
      const newTrackMetadatas = [...values.trackMetadatas]
      const newTracks = [...values.tracks]
      newTrackMetadatas.splice(index, 1)
      newTracks.splice(index, 1)
      // Calculate new index correctly
      let newIndex = selectedIndex
      if (selectedIndex === index) {
        // If removing the selected track, move to the previous one (or 0)
        newIndex = Math.max(index - 1, 0)
      } else if (selectedIndex > index) {
        // If removing a track before the selected one, shift the index down
        newIndex = selectedIndex - 1
      }
      // Clamp to the new array bounds
      newIndex = Math.min(newIndex, newTrackMetadatas.length - 1)

      setValues({
        ...values,
        tracks: newTracks,
        trackMetadatas: newTrackMetadatas,
        trackMetadatasIndex: newIndex
      })
      scrollToTop()
    },
    [
      playingPreviewIndex,
      scrollToTop,
      selectedIndex,
      setValues,
      stopPreview,
      values
    ]
  )

  const isTitleMissing = isEmpty(title)
  const hasError = !isEmpty(errors.trackMetadatas?.[index]) && submitCount > 0

  return (
    <div className={styles.trackRoot} onClick={() => handleClickTrack(index)}>
      {isSelected ? <div className={styles.selectedIndicator} /> : null}
      <div className={cn(styles.track, layoutStyles.row)}>
        <div
          className={cn(styles.trackInfo, layoutStyles.row, layoutStyles.gap3, {
            [styles.selected]: isSelected,
            [styles.error]: hasError
          })}
        >
          <div className={layoutStyles.row}>
            {hasError ? (
              <IconError
                size='xs'
                color='danger'
                css={{ margin: spacing.unit1 }}
              />
            ) : (
              <Text
                variant='body'
                className={styles.trackIndex}
                color={isSelected ? 'accent' : 'default'}
              >
                {index + 1}
              </Text>
            )}
            <DynamicImage
              wrapperClassName={styles.artwork}
              image={artworkUrl || placeholderArt}
              isUrl
            />
          </div>
          <Text
            variant='body'
            size='s'
            color={hasError ? 'danger' : isSelected ? 'accent' : 'default'}
            ellipses
          >
            {isTitleMissing ? messages.titleRequired : title}
          </Text>
          {values.trackMetadatas.length > 1 ? (
            <IconButton
              className={styles.iconRemove}
              size='m'
              color='default'
              aria-label={messages.removeTrack}
              icon={IconTrash}
              onClick={(e) => handleRemoveTrack(e, index)}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
