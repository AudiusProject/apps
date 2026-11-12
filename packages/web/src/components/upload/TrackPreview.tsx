import { ComponentPropsWithoutRef, useState } from 'react'

import { StemCategory, stemCategoryFriendlyNames } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import {
  Box,
  Checkbox,
  FilterButton,
  Flex,
  IconButton,
  IconCompose,
  IconFileAAC,
  IconFileAIFF as iconFileAiff,
  IconFileFLAC as iconFileFlac,
  IconFileM4A as iconFileM4a,
  IconFileMP3 as iconFileMp3,
  IconFileMP4,
  IconFileOGG as iconFileOgg,
  IconFileOPUS,
  IconFileUnknown as iconFileUnknown,
  IconFileWAV as iconFileWav,
  IconFileWEBM,
  IconTrash,
  Text
} from '@audius/harmony'
import cn from 'classnames'
import numeral from 'numeral'

import zIndex from 'utils/zIndex'

import { EditableLabel } from './EditableLabel'
import styles from './TrackPreview.module.css'

const messages = {
  selectType: 'Select Type',
  edit: 'Edit Track',
  remove: 'Remove Track',
  select: (name: string) => `Select ${name}`
}

// Used https://mimetype.io to see the list of related mime types to have a more comprehensive list.
const fileTypeIcon = (type: string) => {
  switch (type) {
    case 'audio/mpeg':
    case 'audio/mp3':
      return iconFileMp3
    case 'audio/mp4':
    case 'audio/mpeg4-generic':
      return IconFileMP4
    case 'audio/m4a':
    case 'audio/x-m4a':
      return iconFileM4a
    case 'audio/aiff':
    case 'audio/x-aiff':
      return iconFileAiff
    case 'audio/flac':
    case 'audio/x-flac':
      return iconFileFlac
    case 'audio/ogg':
      return iconFileOgg
    case 'audio/wav':
    case 'audio/x-wav':
    case 'audio/x-pn-wav':
    case 'audio/vnd.wav':
    case 'audio/wave':
    case 'audio/vnd.wave':
      return iconFileWav
    case 'audio/aac':
      return IconFileAAC
    case 'audio/opus':
      return IconFileOPUS
    case 'audio/webm':
      return IconFileWEBM
    default:
      return iconFileUnknown
  }
}

export type TrackPreviewProps = ComponentPropsWithoutRef<'div'> & {
  index: number
  displayIndex: boolean
  onRemove: () => void
  file?: File
  isTitleEditable?: boolean
  onEditTitle?: (title: string) => void
  isStem?: boolean
  stemCategory?: Nullable<StemCategory>
  onEditStemCategory?: (stemCategory: StemCategory) => void
  allowCategorySwitch?: boolean
  allowDelete?: boolean
  className?: string
  isSelected?: boolean
  onToggleSelected?: () => void
}

export const TrackPreview = (props: TrackPreviewProps) => {
  const {
    displayIndex = false,
    index,
    file,
    onRemove,
    isTitleEditable,
    onEditTitle,
    isStem,
    stemCategory,
    onEditStemCategory,
    allowCategorySwitch = true,
    allowDelete = true,
    className,
    isSelected,
    onToggleSelected,
    ...divProps
  } = props
  const {
    name: trackTitle,
    type: fileType,
    size: fileSize
  } = file ?? {
    name: 'Untitled',
    type: 'audio/mp3',
    size: 0
  }

  const Icon = fileTypeIcon(fileType)
  const iconStyle = isStem ? { width: 24, height: 24 } : undefined

  const [isEditingTitle, setIsEditingTitle] = useState(false)

  const stemCategories = Object.keys(stemCategoryFriendlyNames).map(
    (value) => ({
      value: value as StemCategory,
      label: stemCategoryFriendlyNames[value as StemCategory]
    })
  )

  return (
    <div className={cn(styles.trackPreviewNew, className)} {...divProps}>
      {onToggleSelected ? (
        <Checkbox
          checked={!!isSelected}
          onChange={onToggleSelected}
          aria-label={messages.select(trackTitle)}
        />
      ) : null}
      {displayIndex ? (
        <Text variant='body' className={styles.indexText} size='s'>
          {index + 1}
        </Text>
      ) : null}
      <Icon className={styles.trackPreviewImage} style={iconStyle} />
      {isTitleEditable && onEditTitle ? (
        <EditableLabel
          isEditing={isEditingTitle}
          setIsEditing={setIsEditingTitle}
          value={trackTitle}
          setValue={onEditTitle}
        />
      ) : (
        <Text variant='body' className={styles.titleText} size='s'>
          {trackTitle}
        </Text>
      )}
      <Flex alignItems='center'>
        {isStem && onEditStemCategory ? (
          <Box mr='xl'>
            <FilterButton
              label={messages.selectType}
              options={stemCategories}
              value={stemCategory}
              onChange={onEditStemCategory}
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                zIndex: zIndex.STEMS_AND_DOWNLOADS_FILTER_BUTTON_POPUP
              }}
              disabled={!allowCategorySwitch}
            />
          </Box>
        ) : null}
        <Text
          variant='body'
          className={styles.fileSizeText}
          size='s'
          color='subdued'
        >
          {numeral(fileSize).format('0.0 b')}
        </Text>
        <Flex gap='xs' alignItems='center' className={styles.iconsContainer}>
          {isTitleEditable ? (
            <IconButton
              icon={IconCompose}
              color='subdued'
              size='s'
              aria-label={messages.edit}
              className={styles.editTitleButton}
              onClick={() => setIsEditingTitle(true)}
            />
          ) : null}
          <IconButton
            icon={IconTrash}
            aria-label={messages.remove}
            color='subdued'
            size='s'
            onClick={onRemove}
            disabled={!allowDelete}
            className={styles.removeButton}
          />
        </Flex>
      </Flex>
    </div>
  )
}
