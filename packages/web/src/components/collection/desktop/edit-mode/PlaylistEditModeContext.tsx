import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
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
  status: Status
  draft: PlaylistMetadataDraft
  hasChanges: boolean
  enterEditMode: () => void
  exitEditMode: () => void
  setField: <K extends keyof PlaylistMetadataDraft>(
    field: K,
    value: PlaylistMetadataDraft[K]
  ) => void
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
    savedArtwork
  }: {
    savedDetails: boolean
    savedArtwork: boolean
  }) => {
    if (savedDetails && savedArtwork) return 'Saved details and artwork'
    if (savedArtwork) return 'Saved artwork'
    return 'Saved details'
  },
  conflict:
    'Heads up — someone else changed this playlist while you were editing. Reload and try again.',
  failed: 'Could not save changes. Please try again.'
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
  const { data: collection } = useCollection(collectionId)
  const { data: tracks } = useCollectionTracks(collectionId)

  const [isEditMode, setIsEditMode] = useState(false)
  const [draft, setDraft] = useState<PlaylistMetadataDraft>({})
  const [status, setStatus] = useState<Status>('idle')
  const [editModeLoadedAt, setEditModeLoadedAt] = useState<number | null>(null)

  const enterEditMode = useCallback(() => {
    setIsEditMode(true)
    setDraft({})
    setStatus('idle')
    setEditModeLoadedAt(Date.now())
  }, [])

  const exitEditMode = useCallback(() => {
    setIsEditMode(false)
    setDraft({})
    setStatus('idle')
    setEditModeLoadedAt(null)
  }, [])

  const setField = useCallback<PlaylistEditModeContextValue['setField']>(
    (field, value) => {
      setDraft((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const discard = useCallback(() => {
    setDraft({})
  }, [])

  const resolveConflict = useCallback(() => {
    setStatus('idle')
    setDraft({})
    setIsEditMode(false)
    setEditModeLoadedAt(null)
  }, [])

  const hasChanges = useMemo(() => {
    if (!collection) return false
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
  }, [collection, draft])

  const apply = useCallback(() => {
    if (!collection || !collection.playlist_id) return
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

    const merged: EditCollectionValues = {
      ...(collection as unknown as EditCollectionValues),
      playlist_contents: collection.playlist_contents,
      tracks: tracks ?? [],
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

    dispatch(
      editPlaylist(collection.playlist_id, merged, (success) => {
        if (success) {
          dispatch(
            toast({
              content: messages.saved({ savedDetails, savedArtwork })
            })
          )
          setDraft({})
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
    collection,
    dispatch,
    draft,
    editModeLoadedAt,
    exitEditMode,
    hasChanges,
    tracks
  ])

  const value = useMemo<PlaylistEditModeContextValue>(
    () => ({
      collectionId,
      isOwner,
      isEditMode,
      status,
      draft,
      hasChanges,
      enterEditMode,
      exitEditMode,
      setField,
      apply,
      discard,
      resolveConflict
    }),
    [
      apply,
      collectionId,
      discard,
      draft,
      enterEditMode,
      exitEditMode,
      hasChanges,
      isEditMode,
      isOwner,
      resolveConflict,
      setField,
      status
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
      status: 'idle',
      draft: {},
      hasChanges: false,
      enterEditMode: () => {},
      exitEditMode: () => {},
      setField: () => {},
      apply: () => {},
      discard: () => {},
      resolveConflict: () => {}
    }
  }
  return ctx
}
