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

type SelectionContextValue = {
  selected: Set<ID>
  count: number
  isSelected: (id: ID) => boolean
  toggle: (id: ID, index: number, opts?: { shift?: boolean }) => void
  selectAll: (ids: ID[]) => void
  clear: () => void
  setSelected: (next: Set<ID>) => void
}

const TrackSelectionContext = createContext<SelectionContextValue | null>(null)

type ProviderProps = {
  orderedIds: ID[]
  children: ReactNode
}

export const TrackSelectionProvider = ({
  orderedIds,
  children
}: ProviderProps) => {
  const [selected, setSelectedState] = useState<Set<ID>>(new Set())
  const lastIndexRef = useRef<number | null>(null)

  const setSelected = useCallback((next: Set<ID>) => {
    setSelectedState(new Set(next))
  }, [])

  const isSelected = useCallback((id: ID) => selected.has(id), [selected])

  const toggle = useCallback<SelectionContextValue['toggle']>(
    (id, index, opts) => {
      setSelectedState((prev) => {
        const next = new Set(prev)
        if (opts?.shift && lastIndexRef.current !== null) {
          const [a, b] = [lastIndexRef.current, index].sort((x, y) => x - y)
          for (let i = a; i <= b; i += 1) {
            const sliceId = orderedIds[i]
            if (sliceId !== undefined) next.add(sliceId)
          }
        } else if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        lastIndexRef.current = index
        return next
      })
    },
    [orderedIds]
  )

  const selectAll = useCallback((ids: ID[]) => {
    setSelectedState(new Set(ids))
  }, [])

  const clear = useCallback(() => {
    setSelectedState(new Set())
    lastIndexRef.current = null
  }, [])

  const value = useMemo<SelectionContextValue>(
    () => ({
      selected,
      count: selected.size,
      isSelected,
      toggle,
      selectAll,
      clear,
      setSelected
    }),
    [selected, isSelected, toggle, selectAll, clear, setSelected]
  )

  return (
    <TrackSelectionContext.Provider value={value}>
      {children}
    </TrackSelectionContext.Provider>
  )
}

export const useTrackSelection = (): SelectionContextValue => {
  const ctx = useContext(TrackSelectionContext)
  if (!ctx) {
    // Safe no-op fallback for usage outside the provider.
    return {
      selected: new Set(),
      count: 0,
      isSelected: () => false,
      toggle: () => {},
      selectAll: () => {},
      clear: () => {},
      setSelected: () => {}
    }
  }
  return ctx
}
