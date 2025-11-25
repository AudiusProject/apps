import { useCallback, useState, useRef, useEffect, useMemo } from 'react'

import { useSearchAutocomplete } from '@audius/common/api'
import { Kind } from '@audius/common/models'
import { SearchItemBackwardsCompatible } from '@audius/common/src/store/search/types'
import { searchActions, searchSelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  IconSearch,
  IconCloseAlt,
  IconButton,
  IconArrowRight,
  Flex,
  LoadingSpinner,
  Text,
  PlainButton,
  useHotkeys,
  ModifierKeys
} from '@audius/harmony'
import AutoComplete from 'antd/lib/auto-complete'
import Input from 'antd/lib/input'
import type { InputRef } from 'antd/lib/input'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'
import {
  useLocation,
  matchPath,
  useNavigate,
  useSearchParams
} from 'react-router-dom'
import { useDebounce, usePrevious } from 'react-use'

import { searchResultsPage } from 'utils/route'

import styles from './DesktopSearchBar.module.css'
import { UserResult, TrackResult, CollectionResult } from './SearchBarResult'
const { SEARCH_PAGE } = route
const { getSearchHistory } = searchSelectors
const { removeItem, clearHistory } = searchActions

const DEFAULT_LIMIT = 3
const DEBOUNCE_MS = 400

const messages = {
  viewMoreResults: 'View More Results',
  noResults: 'No Results',
  searchPlaceholder: 'Search',
  clearSearch: 'Clear search',
  clearRecentSearches: 'Clear Recent Searches',
  categories: {
    profiles: 'Profiles',
    tracks: 'Tracks',
    playlists: 'Playlists',
    albums: 'Albums'
  }
}

const ViewMoreButton = ({ query }: { query: string }) => {
  const navigate = useNavigate()

  return (
    <Flex alignItems='center' pt='l' gap='2xs' justifyContent='center'>
      <PlainButton
        iconRight={IconArrowRight}
        onClick={() => navigate(searchResultsPage('all', query))}
        className='dropdown-action'
      >
        {messages.viewMoreResults}
      </PlainButton>
    </Flex>
  )
}

const ClearRecentSearchesButton = () => {
  const dispatch = useDispatch()
  const handleClickClear = useCallback(() => {
    dispatch(clearHistory())
  }, [dispatch])

  return (
    <Flex alignItems='center' pt='l' gap='2xs' justifyContent='center'>
      <PlainButton onClick={handleClickClear} className='dropdown-action'>
        {messages.clearRecentSearches}
      </PlainButton>
    </Flex>
  )
}

const NoResults = () => (
  <Flex alignItems='center' ph='l' pv='m'>
    <Text variant='label' size='s' color='subdued'>
      {messages.noResults}
    </Text>
  </Flex>
)

export const DesktopSearchBar = () => {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('query') || ''
  const searchHistory = useSelector(getSearchHistory)
  const dispatch = useDispatch()

  const [inputValue, setInputValue] = useState(initialQuery)
  const [debouncedValue, setDebouncedValue] = useState(inputValue)
  useDebounce(
    () => {
      setDebouncedValue(inputValue)
    },
    DEBOUNCE_MS,
    [inputValue]
  )

  const inputRef = useRef<InputRef>(null)
  const navigate = useNavigate()

  const isSearchPage = !!matchPath(SEARCH_PAGE, location.pathname)

  const { data, isLoading } = useSearchAutocomplete(
    { query: debouncedValue, limit: DEFAULT_LIMIT },
    { enabled: !isSearchPage }
  )
  const previousDebouncedValue = usePrevious(debouncedValue)
  useEffect(() => {
    if (isSearchPage && debouncedValue !== previousDebouncedValue) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('query', debouncedValue)
      setSearchParams(newParams)
    }
  }, [
    debouncedValue,
    isSearchPage,
    setSearchParams,
    previousDebouncedValue,
    searchParams
  ])

  const handleSearch = useCallback((value: string) => {
    setInputValue(value)
  }, [])

  const handleClear = useCallback(() => {
    setInputValue('')
  }, [])

  const handleSelect = useCallback(() => {
    setInputValue('')
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        if (isSearchPage) {
          const newParams = new URLSearchParams(searchParams)
          newParams.set('query', debouncedValue)
          setSearchParams(newParams)
        } else {
          navigate(searchResultsPage('all', inputValue))
        }
      }
    },
    [
      debouncedValue,
      navigate,
      inputValue,
      isSearchPage,
      searchParams,
      setSearchParams
    ]
  )

  const renderSuffix = () => {
    if (inputValue && !isLoading) {
      return (
        <IconButton
          icon={IconCloseAlt}
          size='2xs'
          color='subdued'
          onClick={handleClear}
          aria-label={messages.clearSearch}
          onMouseDown={(e) => e.preventDefault()}
        />
      )
    }

    if (inputValue && isLoading) {
      return <LoadingSpinner size='s' />
    }
  }

  const autocompleteOptions = useMemo(() => {
    if (!data) return []

    const baseOptions = [
      {
        label: messages.categories.profiles,
        options: data.users.map((user) => ({
          label: <UserResult userId={user.user_id} />,
          value: user.user_id
        }))
      },
      {
        label: messages.categories.tracks,
        options: data.tracks.map((track) => ({
          label: <TrackResult trackId={track.track_id} />,
          value: track.track_id
        }))
      },
      {
        label: messages.categories.playlists,
        options: data.playlists.map((playlist) => ({
          label: <CollectionResult collectionId={playlist.playlist_id} />,
          value: playlist.playlist_id
        }))
      },
      {
        label: messages.categories.albums,
        options: data.albums.map((album) => ({
          label: <CollectionResult collectionId={album.playlist_id} />,
          value: album.playlist_id
        }))
      }
    ].filter((group) => group.options.length > 0)

    const hasNoResults = inputValue && baseOptions.length === 0
    const hasResults = baseOptions.length > 0

    if (hasResults && inputValue) {
      // append to last group to avoid extra spacing between groups
      baseOptions[baseOptions.length - 1].options.push({
        label: <ViewMoreButton query={inputValue} />,
        // @ts-expect-error
        value: 'viewMore'
      })
    } else if (hasNoResults) {
      baseOptions.push({
        options: [
          {
            label: <NoResults />,
            // @ts-expect-error
            value: 'no-results'
          }
        ]
      })
    }

    return baseOptions
  }, [data, inputValue])

  const handleClickClear = useCallback(
    (searchItem: SearchItemBackwardsCompatible) => {
      dispatch(removeItem({ searchItem }))
    },
    [dispatch]
  )

  const recentSearchOptions = useMemo(() => {
    if (!searchHistory.length || inputValue) return []
    const searchHistoryOptions = searchHistory.map((searchItem) => {
      if (searchItem.kind === Kind.USERS) {
        return {
          label: (
            <UserResult
              userId={searchItem.id}
              onRemove={() => handleClickClear(searchItem)}
            />
          ),
          value: searchItem.id
        }
      } else if (searchItem.kind === Kind.TRACKS) {
        return {
          label: (
            <TrackResult
              trackId={searchItem.id}
              onRemove={() => handleClickClear(searchItem)}
            />
          ),
          value: searchItem.id
        }
      } else {
        return {
          label: (
            <CollectionResult
              collectionId={searchItem.id}
              onRemove={() => handleClickClear(searchItem)}
            />
          ),
          value: searchItem.id
        }
      }
    })
    const baseOptions = [
      {
        label: 'Recent Searches',
        options: [
          ...searchHistoryOptions,
          ...(searchHistoryOptions
            ? [
                {
                  label: <ClearRecentSearchesButton />,
                  value: 'Clear search'
                }
              ]
            : [])
        ]
      }
    ]

    return baseOptions
  }, [handleClickClear, inputValue, searchHistory])

  const showResults = !isSearchPage && !!(data || searchHistory || isLoading)
  // Calculate hasNoResults for the dropdown class name
  const hasNoResults =
    data &&
    inputValue &&
    autocompleteOptions.length === 1 &&
    String(autocompleteOptions[0].options?.[0]?.value) === 'no-results'

  const handleFocus = useCallback(() => {
    const searchElement = inputRef.current?.input?.closest(
      '.ant-select-selection-search'
    )
    if (searchElement) {
      searchElement.classList.add('expanded')
    }
  }, [])

  const handleBlur = useCallback(() => {
    if (!document.hasFocus()) return

    const searchElement = inputRef.current?.input?.closest(
      '.ant-select-selection-search'
    )
    if (searchElement) {
      setTimeout(
        () => searchElement.classList.remove('expanded'),
        // Wait for dropdown to close before contracting
        showResults ? 100 : 0
      )
    }
  }, [showResults])

  const focusSearchInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  // Set up hotkeys for '/' and 'Cmd + K' to focus search input
  useHotkeys({
    191: focusSearchInput, // '/' key
    75: {
      // 'K' key
      cb: focusSearchInput,
      and: [ModifierKeys.CMD]
    }
  })

  return (
    <Flex className={styles.searchBar}>
      <AutoComplete
        dropdownClassName={cn(styles.searchBox, {
          [styles.searchBoxEmpty]: hasNoResults
        })}
        dropdownMatchSelectWidth={false}
        options={data ? autocompleteOptions : recentSearchOptions}
        value={inputValue}
        onSearch={handleSearch}
        onSelect={handleSelect}
        getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
      >
        <Input
          inputMode='search'
          ref={inputRef}
          placeholder={messages.searchPlaceholder}
          name='search'
          autoComplete='off'
          type='search'
          prefix={<IconSearch color='subdued' />}
          suffix={renderSuffix()}
          spellCheck={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </AutoComplete>
    </Flex>
  )
}
