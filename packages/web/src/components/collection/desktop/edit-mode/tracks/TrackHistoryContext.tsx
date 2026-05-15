import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react'

import { ID } from '@audius/common/models'
import { cacheCollectionsActions, toastActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

const { addTrackToPlaylist, removeTrackFromPlaylist } = cacheCollectionsActions
const { toast } = toastActions

export type TrackHistoryEntry =
  | {
      type: 'remove'
      trackId: ID
      // best-effort original position; not used to re-insert into the same
      // slot because the existing addTrackToPlaylist saga always appends.
      index: number
      // timestamp captured at the time of removal for the saga call.
      timestamp: number
    }
  | {
      type: 'add'
      trackId: ID
    }

type TrackHistoryContextValue = {
  canUndo: boolean
  canRedo: boolean
  push: (entry: TrackHistoryEntry) => void
  undo: (applyInverse: (entry: TrackHistoryEntry) => void) => void
  redo: () => void
}

const TrackHistoryContext = createContext<TrackHistoryContextValue | null>(null)

type ProviderProps = {
  collectionId?: ID
  children: ReactNode
}

const messages = {
  noMoreUndo: 'Nothing to undo',
  noMoreRedo: 'Nothing to redo'
}

export const TrackHistoryProvider = ({
  collectionId,
  children
}: ProviderProps) => {
  const dispatch = useDispatch()
  const undoStackRef = useRef<TrackHistoryEntry[]>([])
  const redoStackRef = useRef<TrackHistoryEntry[]>([])
  const [, force] = useState(0)
  const bump = useCallback(() => force((v) => v + 1), [])

  const push = useCallback(
    (entry: TrackHistoryEntry) => {
      undoStackRef.current.push(entry)
      redoStackRef.current = []
      bump()
    },
    [bump]
  )

  const undo = useCallback(
    (applyInverse: (entry: TrackHistoryEntry) => void) => {
      const entry = undoStackRef.current.pop()
      if (!entry) {
        dispatch(toast({ content: messages.noMoreUndo }))
        return
      }
      redoStackRef.current.push(entry)
      bump()
      const inverse: TrackHistoryEntry =
        entry.type === 'remove'
          ? { type: 'add', trackId: entry.trackId }
          : { type: 'remove', trackId: entry.trackId, index: -1, timestamp: 0 }
      applyInverse(inverse)
    },
    [bump, dispatch]
  )

  const redo = useCallback(() => {
    const entry = redoStackRef.current.pop()
    if (!entry) {
      dispatch(toast({ content: messages.noMoreRedo }))
      return
    }
    undoStackRef.current.push(entry)
    bump()
    if (!collectionId) return
    if (entry.type === 'remove') {
      dispatch(
        removeTrackFromPlaylist(entry.trackId, collectionId, entry.timestamp)
      )
    } else if (entry.type === 'add') {
      dispatch(
        addTrackToPlaylist(entry.trackId, collectionId, { silent: true })
      )
    }
  }, [bump, collectionId, dispatch])

  const value = useMemo<TrackHistoryContextValue>(
    () => ({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
      push,
      undo,
      redo
    }),
    // Intentionally include bump tick via undoStackRef.current.length read
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [push, undo, redo, undoStackRef.current.length, redoStackRef.current.length]
  )

  return (
    <TrackHistoryContext.Provider value={value}>
      {children}
    </TrackHistoryContext.Provider>
  )
}

export const useTrackHistoryContext = (): TrackHistoryContextValue => {
  const ctx = useContext(TrackHistoryContext)
  if (!ctx) {
    return {
      canUndo: false,
      canRedo: false,
      push: () => {},
      undo: () => {},
      redo: () => {}
    }
  }
  return ctx
}
