import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useCollection, useCollectionTracks } from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  cacheCollectionsActions,
  EditCollectionValues,
  toastActions
} from '@audius/common/store'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'

import { isDraftCollection, removeDraftCollection } from './draftCollections'
import { useCreateDraftPlaylist } from './useCreateDraftPlaylist'

const { editPlaylist } = cacheCollectionsActions
const { toast } = toastActions

type ArtworkDraft = {
  url: string
  file: File
  source?: string
}

export type PlaylistMetadataDraft = {
  playlist_name?: string
  description?: string | null
  is_private?: boolean
  artwork?: ArtworkDraft | null
}

type Status = 'idle' | 'saving' | 'conflict'

type PlaylistEditModeContextValue = {
  collectionId?: ID
  isOwner: boolean
  isEditMode: boolean
  isCreate: boolean
  status: Status
  draft: PlaylistMetadataDraft
  removedTrackIds: Set<ID>
  hasChanges: boolean
  canApply: boolean
  canUndoRemoval: boolean
  canRedoRemoval: boolean
  enterEditMode: () => void
  exitEditMode: () => void
  setField: <K extends keyof PlaylistMetadataDraft>(
    field: K,
    value: PlaylistMetadataDraft[K]
  ) => void
  stageRemoval: (ids: ID[]) => void
  undoRemoval: () => void
  redoRemoval: () => void
  apply: () => void
  discard: () => void
  resolveConflict: () => void
}

const PlaylistEditModeContext =
  createContext<PlaylistEditModeContextValue | null>(null)

const compareValues = (a: unknown, b: unknown) =>
  a === b || (a == null && b == null)

const messages = {
  saved: ({
    savedDetails,
    savedArtwork,
    savedTracks
  }: {
    savedDetails: boolean
    savedArtwork: boolean
    savedTracks: boolean
  }) => {
    const parts: string[] = []
    if (savedDetails) parts.push('details')
    if (savedArtwork) parts.push('artwork')
    if (savedTracks) parts.push('tracks')
    if (parts.length === 0) return 'Saved changes'
    if (parts.length === 1) return `Saved ${parts[0]}`
    const last = parts.pop()
    return `Saved ${parts.join(', ')} and ${last}`
  },
  conflict:
    'Heads up — someone else changed this playlist while you were editing. Reload and try again.',
  failed: 'Could not save changes. Please try again.',
  created: 'Created playlist',
  createFailed: 'Could not create playlist. Please try again.'
}

type ProviderProps = {
  collectionId?: ID
  isOwner: boolean
  children: ReactNode
}

export const PlaylistEditModeProvider = ({
  collectionId,
  isOwner,
  children
}: ProviderProps) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { data: collection } = useCollection(collectionId)
  const { data: tracks } = useCollectionTracks(collectionId)
  const publishDraft = useCreateDraftPlaylist()

  const isCreate = isDraftCollection(collectionId)

  const [isEditMode, setIsEditMode] = useState(false)
  const [draft, setDraft] = useState<PlaylistMetadataDraft>({})
  const [removedTrackIds, setRemovedTrackIds] = useState<Set<ID>>(new Set())
  const [status, setStatus] = useState<Status>('idle')
  const [editModeLoadedAt, setEditModeLoadedAt] = useState<number | null>(null)

  // Undo/redo stacks for staged track removals. Each entry is one user action
  // (a batch of track ids removed together). These live alongside the draft so
  // they reset atomically with it on enter/exit/discard/apply.
  const undoStackRef = useRef<ID[][]>([])
  const redoStackRef = useRef<ID[][]>([])
  const [, setHistoryTick] = useState(0)
  const bumpHistory = useCallback(() => setHistoryTick((t) => t + 1), [])

  const resetRemovals = useCallback(() => {
    setRemovedTrackIds(new Set())
    undoStackRef.current = []
    redoStackRef.current = []
    bumpHistory()
  }, [bumpHistory])

  const enterEditMode = useCallback(() => {
    setIsEditMode(true)
    setDraft({})
    resetRemovals()
    setStatus('idle')
    setEditModeLoadedAt(Date.now())
  }, [resetRemovals])

  const exitEditMode = useCallback(() => {
    setIsEditMode(false)
    setDraft({})
    resetRemovals()
    setStatus('idle')
    setEditModeLoadedAt(null)
  }, [resetRemovals])

  // For the inline create flow, the page mounts already in edit mode.
  const autoEnteredRef = useRef(false)
  useEffect(() => {
    if (isCreate && !autoEnteredRef.current) {
      autoEnteredRef.current = true
      enterEditMode()
    }
  }, [isCreate, enterEditMode])

  const setField = useCallback<PlaylistEditModeContextValue['setField']>(
    (field, value) => {
      setDraft((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const stageRemoval = useCallback(
    (ids: ID[]) => {
      if (ids.length === 0) return
      setRemovedTrackIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
      undoStackRef.current.push(ids)
      redoStackRef.current = []
      bumpHistory()
    },
    [bumpHistory]
  )

  const undoRemoval = useCallback(() => {
    const ids = undoStackRef.current.pop()
    if (!ids) return
    redoStackRef.current.push(ids)
    setRemovedTrackIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    bumpHistory()
  }, [bumpHistory])

  const redoRemoval = useCallback(() => {
    const ids = redoStackRef.current.pop()
    if (!ids) return
    undoStackRef.current.push(ids)
    setRemovedTrackIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
    bumpHistory()
  }, [bumpHistory])

  const discard = useCallback(() => {
    setDraft({})
    resetRemovals()
    setStatus('idle')
    setIsEditMode(false)
    setEditModeLoadedAt(null)
    if (isCreate && collectionId != null) {
      // Abandon the unsaved draft and leave the create page.
      removeDraftCollection(collectionId)
      navigate(-1)
    }
  }, [resetRemovals, isCreate, collectionId, navigate])

  const resolveConflict = useCallback(() => {
    setStatus('idle')
    setDraft({})
    resetRemovals()
    setIsEditMode(false)
    setEditModeLoadedAt(null)
  }, [resetRemovals])

  const stagedName =
    draft.playlist_name !== undefined
      ? draft.playlist_name
      : collection?.playlist_name

  const draftTrackCount = collection?.playlist_contents.track_ids.length ?? 0

  const hasChanges = useMemo(() => {
    if (!collection) return false
    // In create mode the page is "dirty" the moment any content exists, so we
    // warn before navigating away from an unsaved draft.
    if (isCreate && draftTrackCount > 0) return true
    if (removedTrackIds.size > 0) return true
    const fields = ['playlist_name', 'description', 'is_private'] as const
    for (const f of fields) {
      if (
        draft[f] !== undefined &&
        !compareValues(draft[f], (collection as Record<string, unknown>)[f])
      ) {
        return true
      }
    }
    if (draft.artwork !== undefined && draft.artwork !== null) return true
    return false
  }, [collection, draft, removedTrackIds, isCreate, draftTrackCount])

  // For create, the primary action is enabled as long as the playlist has a
  // usable name. For edit, it requires actual changes.
  const canApply = isCreate
    ? !!stagedName && stagedName.trim().length > 0
    : hasChanges

  const apply = useCallback(() => {
    if (!collection || !collection.playlist_id) return

    if (isCreate) {
      if (!canApply) return
      setStatus('saving')
      const trackIds = collection.playlist_contents.track_ids
        .filter((t) => !removedTrackIds.has(t.track))
        .map((t) => t.track)
      const metadata = {
        ...(collection as unknown as EditCollectionValues),
        playlist_name: draft.playlist_name ?? collection.playlist_name,
        description:
          draft.description !== undefined
            ? draft.description
            : collection.description,
        is_private:
          draft.is_private !== undefined
            ? draft.is_private
            : collection.is_private,
        artwork: draft.artwork ?? undefined
      } as EditCollectionValues
      publishDraft.mutate(
        { playlistId: collection.playlist_id, metadata, trackIds },
        {
          onSuccess: (confirmed) => {
            removeDraftCollection(collection.playlist_id)
            setDraft({})
            resetRemovals()
            setIsEditMode(false)
            setStatus('idle')
            setEditModeLoadedAt(null)
            dispatch(toast({ content: messages.created }))
            if (confirmed?.permalink) {
              navigate(confirmed.permalink, { replace: true })
            }
          },
          onError: () => {
            setStatus('idle')
            dispatch(toast({ content: messages.createFailed }))
          }
        }
      )
      return
    }

    if (!hasChanges) {
      exitEditMode()
      return
    }
    // Detect a remote-side change by checking that the collection's
    // `updated_at` hasn't moved since we entered edit mode.
    const updatedAtMs = collection.updated_at
      ? new Date(collection.updated_at).getTime()
      : null
    if (
      editModeLoadedAt !== null &&
      updatedAtMs !== null &&
      updatedAtMs > editModeLoadedAt
    ) {
      setStatus('conflict')
      dispatch(toast({ content: messages.conflict }))
      return
    }

    setStatus('saving')

    const playlistContents = {
      ...collection.playlist_contents,
      track_ids: collection.playlist_contents.track_ids.filter(
        (t) => !removedTrackIds.has(t.track)
      )
    }

    const merged: EditCollectionValues = {
      ...(collection as unknown as EditCollectionValues),
      playlist_contents: playlistContents,
      tracks: (tracks ?? []).filter(
        (t) => t.track_id == null || !removedTrackIds.has(t.track_id)
      ),
      playlist_name: draft.playlist_name ?? collection.playlist_name,
      description:
        draft.description !== undefined
          ? draft.description
          : collection.description,
      is_private:
        draft.is_private !== undefined
          ? draft.is_private
          : collection.is_private,
      artwork: draft.artwork ?? { url: '' }
    } as EditCollectionValues

    const savedDetails =
      draft.playlist_name !== undefined ||
      draft.description !== undefined ||
      draft.is_private !== undefined
    const savedArtwork = draft.artwork != null
    const savedTracks = removedTrackIds.size > 0

    dispatch(
      editPlaylist(collection.playlist_id, merged, (success) => {
        if (success) {
          dispatch(
            toast({
              content: messages.saved({
                savedDetails,
                savedArtwork,
                savedTracks
              })
            })
          )
          setDraft({})
          resetRemovals()
          setIsEditMode(false)
          setStatus('idle')
          setEditModeLoadedAt(null)
        } else {
          dispatch(toast({ content: messages.failed }))
          setStatus('idle')
        }
      })
    )
  }, [
    canApply,
    collection,
    dispatch,
    draft,
    editModeLoadedAt,
    exitEditMode,
    hasChanges,
    isCreate,
    navigate,
    publishDraft,
    removedTrackIds,
    resetRemovals,
    tracks
  ])

  const canUndoRemoval = undoStackRef.current.length > 0
  const canRedoRemoval = redoStackRef.current.length > 0

  const value = useMemo<PlaylistEditModeContextValue>(
    () => ({
      collectionId,
      isOwner,
      isEditMode,
      isCreate,
      status,
      draft,
      removedTrackIds,
      hasChanges,
      canApply,
      canUndoRemoval,
      canRedoRemoval,
      enterEditMode,
      exitEditMode,
      setField,
      stageRemoval,
      undoRemoval,
      redoRemoval,
      apply,
      discard,
      resolveConflict
    }),
    [
      apply,
      canApply,
      canRedoRemoval,
      canUndoRemoval,
      collectionId,
      discard,
      draft,
      enterEditMode,
      exitEditMode,
      hasChanges,
      isCreate,
      isEditMode,
      isOwner,
      redoRemoval,
      removedTrackIds,
      resolveConflict,
      setField,
      stageRemoval,
      status,
      undoRemoval
    ]
  )

  return (
    <PlaylistEditModeContext.Provider value={value}>
      {children}
    </PlaylistEditModeContext.Provider>
  )
}

export const usePlaylistEditMode = (): PlaylistEditModeContextValue => {
  const ctx = useContext(PlaylistEditModeContext)
  if (!ctx) {
    // Not inside a provider — return a no-op context for safe usage in shared
    // components like CollectionHeader that are rendered for both owners and
    // non-owners.
    return {
      collectionId: undefined,
      isOwner: false,
      isEditMode: false,
      isCreate: false,
      status: 'idle',
      draft: {},
      removedTrackIds: new Set(),
      hasChanges: false,
      canApply: false,
      canUndoRemoval: false,
      canRedoRemoval: false,
      enterEditMode: () => {},
      exitEditMode: () => {},
      setField: () => {},
      stageRemoval: () => {},
      undoRemoval: () => {},
      redoRemoval: () => {},
      apply: () => {},
      discard: () => {},
      resolveConflict: () => {}
    }
  }
  return ctx
}
