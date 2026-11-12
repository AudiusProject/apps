import { useCallback, useMemo, useState } from 'react'

import { useTrackFileInfo } from '@audius/common/api'
import {
  StemCategory,
  StemUploadWithFile,
  stemCategoryFriendlyNames
} from '@audius/common/models'
import { Box, Checkbox, FilterButton, Flex, Text } from '@audius/harmony'
import cn from 'classnames'

import { Dropzone } from 'components/upload/Dropzone'
import { TrackPreview, TrackPreviewProps } from 'components/upload/TrackPreview'
import zIndex from 'utils/zIndex'

import styles from './StemFilesView.module.css'

const MAX_ROWS = 200

const messages = {
  additionalFiles: 'UPLOAD ADDITIONAL FILES',
  audioQuality: 'Provide FLAC, WAV, ALAC, or AIFF for highest audio quality',
  maxCapacity: `Reached upload limit of ${MAX_ROWS} files.`,
  stemTypeHeader: 'Select Stem Type',
  stemTypeDescription: 'Please select a stem type for each of your files.',
  duplicateStems: 'Some files with duplicate names could not be uploaded.',
  selectAll: 'Select all',
  selected: (count: number) => `${count} selected`,
  setType: 'Set Type'
}

const stemCategoryOptions = Object.keys(stemCategoryFriendlyNames).map(
  (value) => ({
    value: value as StemCategory,
    label: stemCategoryFriendlyNames[value as StemCategory]
  })
)

const makeStemKey = (stem: StemUploadWithFile) => {
  return stem.metadata.track_id ?? stem.metadata.orig_filename
}

type StemFilesViewProps = {
  onAddStems: (stems: any) => void
  stems: StemUploadWithFile[]
  onSelectCategory: (category: StemCategory, index: number) => void
  onSelectCategoryForStems: (category: StemCategory, indices: number[]) => void
  onDeleteStem: (index: number) => void
}

type StemPreviewProps = Omit<TrackPreviewProps, 'file'> & {
  stem: StemUploadWithFile
}

const StemFilePreview = (props: StemPreviewProps) => {
  return props.stem.metadata.track_id ? (
    <StemRemoteFilePreview {...props} />
  ) : (
    <TrackPreview {...props} file={props.stem.file} />
  )
}

const StemRemoteFilePreview = (props: StemPreviewProps) => {
  const { data } = useTrackFileInfo(props.stem.metadata.track_id)
  const file = useMemo(() => {
    if (data) {
      return {
        name: props.stem.metadata.orig_filename ?? '',
        type: data.contentType,
        size: data.size
      } as File
    }
    return props.stem.file
  }, [data, props.stem.file, props.stem.metadata.orig_filename])
  return <TrackPreview {...props} file={file} />
}

export const StemFilesView = ({
  onAddStems,
  stems,
  onSelectCategory,
  onSelectCategoryForStems,
  onDeleteStem
}: StemFilesViewProps) => {
  // Multi-select so a batch of stems can be given one type at once.
  const [selectedKeys, setSelectedKeys] = useState<
    Set<ReturnType<typeof makeStemKey>>
  >(() => new Set())
  const isSelectable = stems.length > 1
  const selectableIndices = stems
    .map((stem, i) => (stem.allowCategorySwitch === false ? -1 : i))
    .filter((i) => i >= 0)
  const selectedIndices = selectableIndices.filter((i) =>
    selectedKeys.has(makeStemKey(stems[i]))
  )
  const allSelected =
    selectableIndices.length > 0 &&
    selectedIndices.length === selectableIndices.length

  const toggleSelected = (stem: StemUploadWithFile) => {
    const key = makeStemKey(stem)
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedKeys(
      allSelected
        ? new Set()
        : new Set(selectableIndices.map((i) => makeStemKey(stems[i])))
    )
  }

  const handleSetTypeForSelected = (category: StemCategory) => {
    onSelectCategoryForStems(category, selectedIndices)
    setSelectedKeys(new Set())
  }

  const renderStemFiles = () => {
    return stems.length > 0 ? (
      <>
        <Flex direction='column'>
          <Text variant='title' size='l'>
            {messages.stemTypeHeader}
          </Text>
          <Box mt='s'>
            <Text variant='body'>{messages.stemTypeDescription}</Text>
          </Box>
        </Flex>
        {isSelectable ? (
          <Flex alignItems='center' justifyContent='space-between' gap='m'>
            <Flex alignItems='center' gap='m' pl='l'>
              <Checkbox
                checked={selectedIndices.length > 0}
                indeterminate={selectedIndices.length > 0 && !allSelected}
                onChange={toggleAll}
                aria-label={messages.selectAll}
              />
              <Text variant='body' size='s' color='subdued'>
                {selectedIndices.length > 0
                  ? messages.selected(selectedIndices.length)
                  : messages.selectAll}
              </Text>
            </Flex>
            <FilterButton
              label={messages.setType}
              options={stemCategoryOptions}
              value={null}
              onChange={handleSetTypeForSelected}
              disabled={selectedIndices.length === 0}
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                zIndex: zIndex.STEMS_AND_DOWNLOADS_FILTER_BUTTON_POPUP
              }}
            />
          </Flex>
        ) : null}
        <Flex
          role='list'
          direction='column'
          borderRadius='m'
          border='default'
          css={{ overflow: 'hidden' }}
        >
          {stems.map((stem, i) => (
            <StemFilePreview
              role='listitem'
              className={styles.stemPreview}
              index={i}
              displayIndex={stems.length > 1}
              key={`stem-${makeStemKey(stem)}`}
              stem={stem}
              onRemove={() => onDeleteStem(i)}
              stemCategory={stem.category}
              onEditStemCategory={(category) => onSelectCategory(category, i)}
              allowCategorySwitch={stem.allowCategorySwitch}
              allowDelete={stem.allowDelete}
              isSelected={selectedKeys.has(makeStemKey(stem))}
              onToggleSelected={
                isSelectable && stem.allowCategorySwitch !== false
                  ? () => toggleSelected(stem)
                  : undefined
              }
              isStem
            />
          ))}
        </Flex>
      </>
    ) : null
  }

  const useRenderDropzone = () => {
    const atCapacity = stems.length >= MAX_ROWS
    const [duplicateStems, setDuplicateStems] = useState<string[]>([])

    // Trim out stems > MAX_ROWS on add
    const onAdd = useCallback(
      (toAdd: any[]) => {
        const remaining = MAX_ROWS - stems.length
        setDuplicateStems([])

        // Filter out stems that already exist
        const newStems = []
        const duplicateStems = []

        for (const stem of toAdd) {
          const hasDup = stems.find(
            (s) => s.metadata.orig_filename === stem.name
          )

          if (hasDup) {
            duplicateStems.push(stem.name)
          } else {
            newStems.push(stem)
          }
        }

        onAddStems(newStems.slice(0, remaining))
        setDuplicateStems(duplicateStems)
      },
      // eslint-disable-next-line
      [stems]
    )

    return (
      <>
        {duplicateStems.length > 0 && (
          <Text
            variant='body'
            strength='strong'
            color='danger'
            textAlign='center'
          >
            {messages.duplicateStems}
          </Text>
        )}
        <Dropzone
          className={cn(styles.dropZone, {
            [styles.dropzoneDisabled]: atCapacity
          })}
          titleTextClassName={cn(styles.dropzoneTitle, {
            [styles.dropzoneDisabled]: atCapacity
          })}
          messageClassName={cn(styles.dropzoneMessage, {
            [styles.dropzoneDisabled]: atCapacity
          })}
          iconClassName={cn(styles.dropzoneIcon, {
            [styles.dropzoneDisabled]: atCapacity
          })}
          textAboveIcon={messages.additionalFiles}
          subtextAboveIcon={messages.audioQuality}
          onDropAccepted={onAdd}
          type='stem'
          subtitle={atCapacity ? messages.maxCapacity : undefined}
          disableClick={atCapacity}
          disabled={atCapacity}
          isTruncated={stems.length > 0}
        />
      </>
    )
  }

  return (
    <div className={styles.stemFilesContainer}>
      {renderStemFiles()}
      {useRenderDropzone()}
    </div>
  )
}
