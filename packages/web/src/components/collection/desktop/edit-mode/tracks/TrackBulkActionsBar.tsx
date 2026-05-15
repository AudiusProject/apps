import { useCallback, useEffect, useMemo } from 'react'

import { useCollection, useTracks } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { cacheCollectionsActions, toastActions } from '@audius/common/store'
import {
  Button,
  Flex,
  IconCopy,
  IconTrash,
  Text,
  useTheme
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { usePlaylistEditMode } from '../PlaylistEditModeContext'

import { useTrackHistoryContext } from './TrackHistoryContext'
import { useTrackSelection } from './TrackSelectionContext'

const { removeTrackFromPlaylist, addTrackToPlaylist } = cacheCollectionsActions
const { toast } = toastActions

const messages = {
  selected: (n: number) => `${n} selected`,
  copy: 'Copy URLs',
  remove: 'Remove',
  clear: 'Clear',
  selectAll: 'Select all',
  undo: 'Undo',
  redo: 'Redo',
  copiedOne: 'Copied 1 track URL to clipboard',
  copiedMany: (n: number) => `Copied ${n} track URLs to clipboard`,
  copyFailed: 'Could not copy URLs to clipboard',
  removed: (n: number) => (n === 1 ? 'Removed 1 track' : `Removed ${n} tracks`)
}

type Props = {
  collectionId: ID
  orderedTrackIds: ID[]
}

export const TrackBulkActionsBar = (props: Props) => {
  const { collectionId, orderedTrackIds } = props
  const dispatch = useDispatch()
  const { color } = useTheme()
  const editMode = usePlaylistEditMode()
  const selection = useTrackSelection()
  const history = useTrackHistoryContext()

  const { data: collection } = useCollection(collectionId)
  const selectedIds = useMemo(
    () => orderedTrackIds.filter((id) => selection.isSelected(id)),
    [orderedTrackIds, selection]
  )
  const { data: selectedTracks } = useTracks(selectedIds)

  const copyUrls = useCallback(async () => {
    if (!selectedTracks?.length) return
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://audius.co'
    const urls = selectedTracks
      .map((t) => (t?.permalink ? `${origin}${t.permalink}` : null))
      .filter((u): u is string => !!u)
      .join('\n')
    try {
      await navigator.clipboard.writeText(urls)
      dispatch(
        toast({
          content:
            urls.split('\n').length === 1
              ? messages.copiedOne
              : messages.copiedMany(urls.split('\n').length)
        })
      )
    } catch {
      dispatch(toast({ content: messages.copyFailed }))
    }
  }, [dispatch, selectedTracks])

  const removeSelected = useCallback(() => {
    if (!collection) return
    const trackIds = selectedIds
    if (trackIds.length === 0) return
    // Record each removal in history so it can be undone.
    trackIds.forEach((trackId) => {
      const entry = collection.playlist_contents.track_ids.find(
        (t) => t.track === trackId
      )
      if (!entry) return
      const index = collection.playlist_contents.track_ids.findIndex(
        (t) => t.track === trackId && t.time === entry.time
      )
      const timestamp = entry.metadata_time ?? entry.time
      history.push({ type: 'remove', trackId, index, timestamp })
      dispatch(removeTrackFromPlaylist(trackId, collectionId, timestamp))
    })
    dispatch(toast({ content: messages.removed(trackIds.length) }))
    selection.clear()
  }, [collection, collectionId, dispatch, history, selectedIds, selection])

  const handleUndo = useCallback(() => {
    history.undo((inverse) => {
      if (inverse.type === 'add') {
        dispatch(
          addTrackToPlaylist(inverse.trackId, collectionId, { silent: true })
        )
      }
    })
  }, [collectionId, dispatch, history])

  const handleRedo = useCallback(() => {
    history.redo()
  }, [history])

  // Keyboard shortcuts: only active while in edit mode
  useEffect(() => {
    if (!editMode.isEditMode || editMode.collectionId !== collectionId) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInputFocused =
        target &&
        ['INPUT', 'TEXTAREA'].includes(target.tagName) &&
        !target.dataset.bulkActions
      if (isInputFocused) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        selection.selectAll(orderedTrackIds)
        return
      }
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
      if (
        (mod && e.key.toLowerCase() === 'z' && e.shiftKey) ||
        (mod && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault()
        handleRedo()
        return
      }
      if (e.key === 'Escape') {
        if (selection.count > 0) {
          e.preventDefault()
          selection.clear()
        }
      }
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selection.count > 0
      ) {
        e.preventDefault()
        removeSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    collectionId,
    editMode.collectionId,
    editMode.isEditMode,
    handleRedo,
    handleUndo,
    orderedTrackIds,
    removeSelected,
    selection
  ])

  if (!editMode.isEditMode || editMode.collectionId !== collectionId) {
    return null
  }
  if (selection.count === 0 && !history.canUndo && !history.canRedo) {
    return null
  }

  return (
    <Flex
      data-bulk-actions
      css={{
        position: 'sticky',
        top: 0,
        zIndex: 4,
        backgroundColor: color.background.surface1,
        borderBottom: `1px solid ${color.border.strong}`
      }}
      p='m'
      gap='m'
      alignItems='center'
      justifyContent='space-between'
    >
      <Flex gap='m' alignItems='center'>
        <Text variant='body' strength='strong'>
          {messages.selected(selection.count)}
        </Text>
        {selection.count > 0 ? (
          <Button variant='secondary' size='small' onClick={selection.clear}>
            {messages.clear}
          </Button>
        ) : null}
        <Button
          variant='secondary'
          size='small'
          onClick={() => selection.selectAll(orderedTrackIds)}
        >
          {messages.selectAll}
        </Button>
      </Flex>
      <Flex gap='m' alignItems='center'>
        <Button
          variant='secondary'
          size='small'
          iconLeft={IconCopy}
          disabled={selection.count === 0}
          onClick={copyUrls}
        >
          {messages.copy}
        </Button>
        <Button
          variant='destructive'
          size='small'
          iconLeft={IconTrash}
          disabled={selection.count === 0}
          onClick={removeSelected}
        >
          {messages.remove}
        </Button>
        <Button
          variant='secondary'
          size='small'
          disabled={!history.canUndo}
          onClick={handleUndo}
        >
          {messages.undo}
        </Button>
        <Button
          variant='secondary'
          size='small'
          disabled={!history.canRedo}
          onClick={handleRedo}
        >
          {messages.redo}
        </Button>
      </Flex>
    </Flex>
  )
}
