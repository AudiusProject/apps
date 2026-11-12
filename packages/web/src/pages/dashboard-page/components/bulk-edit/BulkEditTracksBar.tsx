import { useCallback, useMemo, useState } from 'react'

import { ID } from '@audius/common/models'
import { Button, Checkbox, Flex, IconPencil, Text } from '@audius/harmony'

import { BulkEditTracksModal } from 'components/bulk-edit-tracks/BulkEditTracksModal'
import { useTrackSelection } from 'components/collection/desktop/edit-mode/tracks/TrackSelectionContext'

const messages = {
  selectAll: 'Select all',
  selected: (count: number) => `${count} selected`,
  clear: 'Clear',
  edit: 'Edit'
}

type BulkEditTracksBarProps = {
  /** Tracks currently shown in the table. */
  tracks: { track_id: ID; title: string }[]
}

export const BulkEditTracksBar = ({ tracks }: BulkEditTracksBarProps) => {
  const selection = useTrackSelection()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Rows hidden by a filter or search don't count as selected.
  const selectedTracks = useMemo(
    () => tracks.filter((track) => selection.isSelected(track.track_id)),
    [tracks, selection]
  )
  const selectedCount = selectedTracks.length
  const allSelected = tracks.length > 0 && selectedCount === tracks.length

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      selection.clear()
    } else {
      selection.selectAll(tracks.map((track) => track.track_id))
    }
  }, [allSelected, selection, tracks])

  return (
    <Flex
      ph='2xl'
      pv='s'
      gap='l'
      alignItems='center'
      justifyContent='space-between'
      borderTop='default'
      css={{ minHeight: 48 }}
    >
      <Flex as='label' gap='m' alignItems='center' css={{ cursor: 'pointer' }}>
        <Checkbox
          aria-label={messages.selectAll}
          checked={selectedCount > 0}
          indeterminate={selectedCount > 0 && !allSelected}
          onChange={handleToggleAll}
        />
        <Text variant='body' size='s' strength='strong' color='subdued'>
          {selectedCount > 0
            ? messages.selected(selectedCount)
            : messages.selectAll}
        </Text>
      </Flex>
      {selectedCount > 0 ? (
        <Flex gap='s'>
          <Button variant='secondary' size='small' onClick={selection.clear}>
            {messages.clear}
          </Button>
          <Button
            variant='primary'
            size='small'
            iconLeft={IconPencil}
            onClick={() => setIsModalOpen(true)}
          >
            {messages.edit}
          </Button>
        </Flex>
      ) : null}
      <BulkEditTracksModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdated={selection.clear}
        tracks={selectedTracks}
      />
    </Flex>
  )
}
