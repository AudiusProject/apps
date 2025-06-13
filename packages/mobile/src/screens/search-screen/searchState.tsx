import type { Dispatch, SetStateAction } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useState,
  useMemo
} from 'react'

import { type SearchCategory, type SearchFilters } from '@audius/common/api'
import { isEmpty } from 'lodash'
import { useDebounce } from 'react-use'

export const ALL_RESULTS_LIMIT = 5

type SearchContextType = {
  query: string
  setQuery: Dispatch<SetStateAction<string>>
  debouncedQuery: string
  category: SearchCategory
  setCategory: Dispatch<SetStateAction<SearchCategory>>
  filters: SearchFilters
  setFilters: Dispatch<SetStateAction<SearchFilters>>
  bpmType: string
  setBpmType: Dispatch<SetStateAction<string>>
  autoFocus: boolean
  setAutoFocus: Dispatch<SetStateAction<boolean>>
  active: boolean
}

export const SearchContext = createContext<SearchContextType>({
  query: '',
  setQuery: (_) => {},
  debouncedQuery: '',
  category: 'all',
  setCategory: (_) => {},
  filters: {},
  setFilters: (_) => {},
  // Special state to track how bpm is being set
  bpmType: 'range',
  setBpmType: (_) => {},
  // Special state to determine if the search query input should be focused automatically
  autoFocus: false,
  setAutoFocus: (_) => {},
  active: false
})

type SearchProviderProps = {
  children: React.ReactNode
  initialCategory?: SearchCategory
  initialFilters?: SearchFilters
  initialAutoFocus?: boolean
  initialQuery?: string
}

export const SearchProvider = ({
  children,
  initialCategory = 'all',
  initialFilters = {},
  initialAutoFocus = false,
  initialQuery = ''
}: SearchProviderProps) => {
  // State
  const [category, setCategory] = useState<SearchCategory>(initialCategory)
  const [filters, setFilters] = useState<SearchFilters>(initialFilters)
  const [bpmType, setBpmType] = useState<'range' | 'target'>('range')
  const [autoFocus, setAutoFocus] = useState(initialAutoFocus)
  const [searchInput, setSearchInput] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(searchInput)

  useDebounce(
    () => {
      setDebouncedQuery(searchInput)
    },
    400, // debounce delay in ms
    [searchInput]
  )

  const contextValue = useMemo(
    () => ({
      query: searchInput,
      setQuery: setSearchInput,
      debouncedQuery,
      category,
      setCategory,
      filters,
      setFilters,
      bpmType,
      setBpmType,
      autoFocus,
      setAutoFocus,
      active: true
    }),
    [searchInput, debouncedQuery, category, filters, bpmType, autoFocus]
  )

  return (
    <SearchContext.Provider value={contextValue}>
      {children}
    </SearchContext.Provider>
  )
}

export const useSearchDebouncedQuery = () => {
  const { debouncedQuery } = useContext(SearchContext)
  return debouncedQuery
}

export const useIsEmptySearch = () => {
  const { query, filters } = useContext(SearchContext)
  return !query && isEmpty(filters)
}

export const useSearchQuery = () => {
  const { query, setQuery } = useContext(SearchContext)
  return [query, setQuery] as const
}

export const useSearchAutoFocus = () => {
  const { autoFocus, setAutoFocus } = useContext(SearchContext)
  return [autoFocus, setAutoFocus] as const
}

export const useSearchBpmType = () => {
  const { bpmType, setBpmType } = useContext(SearchContext)
  return [bpmType, setBpmType] as const
}

export const useSearchCategory = () => {
  const { category, setCategory } = useContext(SearchContext)
  return [category, setCategory] as const
}

export const useSearchFilters = () => {
  const { filters, setFilters } = useContext(SearchContext)
  return [filters, setFilters] as const
}

export const useSearchFilter = <F extends keyof SearchFilters>(
  filterKey: F
) => {
  const { filters, setFilters } = useContext(SearchContext)

  const filter = filters[filterKey]

  const setFilter = useCallback(
    (value: SearchFilters[F]) => {
      setFilters((filters) => ({ ...filters, [filterKey]: value }))
    },
    [filterKey, setFilters]
  )

  const clearFilter = useCallback(() => {
    setFilters((filters) => ({ ...filters, [filterKey]: undefined }))
  }, [filterKey, setFilters])

  return [filter, setFilter, clearFilter] as const
}
