import { ComponentProps, useCallback, useEffect, useRef } from 'react'

import { ID } from '@audius/common/models'

import { TracksTable } from 'components/tracks-table'

import { usePlaylistEditMode } from '../PlaylistEditModeContext'

import styles from './EditAwareTracksTable.module.css'
import { useTrackSelection } from './TrackSelectionContext'

type TrackLike = { track_id?: number | null } & Record<string, unknown>

type EditAwareTracksTableProps = ComponentProps<typeof TracksTable> & {
  collectionId: ID
}

/**
 * Wraps the standard TracksTable for the playlist detail page so that, while
 * the page is in edit mode, clicking a row toggles selection (shift to extend
 * the range) instead of activating playback. Outside of edit mode the
 * behavior is identical to the underlying TracksTable.
 */
export const EditAwareTracksTable = (props: EditAwareTracksTableProps) => {
  const { collectionId, onClickRow, ...rest } = props
  const editMode = usePlaylistEditMode()
  const selection = useTrackSelection()
  const isEditingThis =
    editMode.isEditMode && editMode.collectionId === collectionId

  // Capture shift modifier state from keyboard so we can extend the selection
  // even though TracksTable's onClickRow does not pass the MouseEvent.
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
    // Without this, Cmd/Alt-Tabbing away while holding Shift leaves shiftRef
    // stuck true because the keyup fires in the other window.
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
      onClickRow={handleClickRow}
      rowClassNameAddition={rowClassNameAddition}
    />
  )
}
