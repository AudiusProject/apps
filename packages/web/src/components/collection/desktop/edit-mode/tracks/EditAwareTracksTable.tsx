import {
  ComponentProps,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef
} from 'react'

import { ID } from '@audius/common/models'
import { Checkbox, Flex } from '@audius/harmony'

import { TracksTable } from 'components/tracks-table'

import { usePlaylistEditMode } from '../PlaylistEditModeContext'

import styles from './EditAwareTracksTable.module.css'
import { useTrackSelection } from './TrackSelectionContext'

type TrackLike = { track_id?: number | null } & Record<string, unknown>

type EditAwareTracksTableProps = ComponentProps<typeof TracksTable> & {
  collectionId: ID
}

export const EditAwareTracksTable = (props: EditAwareTracksTableProps) => {
  const { collectionId, onClickRow, data, ...rest } = props
  const editMode = usePlaylistEditMode()
  const selection = useTrackSelection()
  const isEditingThis =
    editMode.isEditMode && editMode.collectionId === collectionId

  const visibleData = useMemo(() => {
    if (!isEditingThis || editMode.removedTrackIds.size === 0) return data
    return data.filter(
      (t) =>
        typeof t.track_id !== 'number' ||
        !editMode.removedTrackIds.has(t.track_id)
    )
  }, [data, editMode.removedTrackIds, isEditingThis])

  const selectableTrackIds = useMemo(() => {
    if (!isEditingThis) return [] as ID[]
    const ids: ID[] = []
    for (const t of visibleData) {
      if (typeof t.track_id === 'number') ids.push(t.track_id)
    }
    return ids
  }, [visibleData, isEditingThis])

  const selectableCount = selectableTrackIds.length
  const selectedCount = selection.count
  const allSelected = selectableCount > 0 && selectedCount >= selectableCount
  const someSelected = selectedCount > 0 && !allSelected

  const handleHeaderCheckboxClick = useCallback(
    (e: MouseEvent<HTMLInputElement>) => {
      e.stopPropagation()
      if (allSelected) {
        selection.clear()
      } else {
        selection.selectAll(selectableTrackIds)
      }
    },
    [allSelected, selectableTrackIds, selection]
  )

  const trackNameHeader = useMemo(() => {
    if (!isEditingThis) return undefined
    return (
      <Flex alignItems='center' gap='m'>
        <Checkbox
          aria-label={allSelected ? 'Deselect all tracks' : 'Select all tracks'}
          checked={selectedCount > 0}
          indeterminate={someSelected}
          onClick={handleHeaderCheckboxClick}
          onChange={() => {}}
        />
        Track
      </Flex>
    )
  }, [
    allSelected,
    handleHeaderCheckboxClick,
    isEditingThis,
    selectedCount,
    someSelected
  ])

  const renderTrackPrefix = useCallback(
    (track: TrackLike, index: number) => {
      const id = track.track_id
      if (typeof id !== 'number') return null
      const checked = selection.isSelected(id)
      return (
        <Checkbox
          aria-label={checked ? 'Deselect track' : 'Select track'}
          checked={checked}
          onClick={(e) => {
            e.stopPropagation()
            selection.toggle(id, index)
          }}
          onChange={() => {}}
        />
      )
    },
    [selection]
  )

  const shiftRef = useRef(false)
  useEffect(() => {
    if (!isEditingThis) {
      shiftRef.current = false
      return
    }
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftRef.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftRef.current = false
    }
    const reset = () => {
      shiftRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', reset)
    }
  }, [isEditingThis])

  const handleClickRow = useCallback(
    (track: TrackLike, index: number) => {
      if (!isEditingThis) {
        onClickRow?.(track, index)
        return
      }
      const id = track.track_id
      if (typeof id !== 'number') return
      selection.toggle(id, index, { shift: shiftRef.current })
    },
    [isEditingThis, onClickRow, selection]
  )

  const rowClassNameAddition = useCallback(
    (track: TrackLike) => {
      if (!isEditingThis) return undefined
      const id = track.track_id
      if (typeof id !== 'number') return undefined
      return selection.isSelected(id) ? styles.selected : undefined
    },
    [isEditingThis, selection]
  )

  return (
    <TracksTable
      {...rest}
      data={visibleData}
      onClickRow={handleClickRow}
      rowClassNameAddition={rowClassNameAddition}
      trackNameHeader={trackNameHeader}
      renderTrackPrefix={isEditingThis ? renderTrackPrefix : undefined}
    />
  )
}
