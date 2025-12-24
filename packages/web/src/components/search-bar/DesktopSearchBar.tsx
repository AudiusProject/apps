import {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
  MutableRefObject
} from 'react'

import { useSearchAutocomplete } from '@audius/common/api'
import { Kind } from '@audius/common/models'
import { SearchItemBackwardsCompatible } from '@audius/common/src/store/search/types'
import { searchActions, searchSelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  IconSearch,
  IconArrowRight,
  Flex,
  LoadingSpinner,
  Text,
  PlainButton,
  TextInput,
  TextInputSize,
  useHotkeys,
  ModifierKeys
} from '@audius/harmony'
import { Menu, MenuContent } from '@audius/harmony/src/components/internal/Menu'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'
import {
  useLocation,
  matchPath,
  useNavigate,
  useSearchParams
} from 'react-router'
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

  const inputRef = useRef<HTMLInputElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)
  const anchorRef = inputContainerRef as MutableRefObject<HTMLElement | null>
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
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

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setIsMenuOpen(true)
  }, [])

  const handleSelect = useCallback(() => {
    setInputValue('')
    setIsMenuOpen(false)
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

  const options = data ? autocompleteOptions : recentSearchOptions
  const hasOptions = options.length > 0
  const showResults = !isSearchPage && hasOptions
  const shouldShowMenu = isMenuOpen && showResults
  // Calculate hasNoResults for the dropdown class name
  const hasNoResults =
    data &&
    inputValue &&
    autocompleteOptions.length === 1 &&
    String(autocompleteOptions[0].options?.[0]?.value) === 'no-results'

  // Update menu visibility based on results
  useEffect(() => {
    if (hasOptions && inputValue) {
      setIsMenuOpen(true)
    }
  }, [hasOptions, inputValue])

  const handleFocus = useCallback(() => {
    setIsMenuOpen(true)
  }, [])

  const handleBlur = useCallback(() => {
    // Delay closing to allow clicks on menu items
    setTimeout(() => {
      if (!document.hasFocus()) return
      setIsMenuOpen(false)
    }, 200)
  }, [])

  const focusSearchInput = useCallback(() => {
    inputRef.current?.focus()
    setIsMenuOpen(true)
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

  const renderMenuContent = () => {
    return (
      <MenuContent
        scrollRef={scrollRef}
        maxHeight='560px'
        width='280px'
        MenuListProps={{
          css: {
            padding: '16px 8px',
            overflowY: 'auto',
            width: '100%'
          }
        }}
        aria-label='Search results'
      >
        {options.map((group, groupIndex) => (
          <Flex key={groupIndex} direction='column' gap='xs' w='100%'>
            {group.label && (
              <Text
                variant='label'
                size='xs'
                color='subdued'
                css={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.7px',
                  padding: '8px',
                  fontWeight: 'bold'
                }}
              >
                {group.label}
              </Text>
            )}
            {group.options.map((option, optionIndex) => (
              <Flex
                key={optionIndex}
                onClick={() => {
                  if (
                    option.value !== 'viewMore' &&
                    option.value !== 'no-results'
                  ) {
                    handleSelect()
                  }
                }}
                css={{
                  cursor: 'pointer',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  '&:hover': {
                    backgroundColor: 'var(--harmony-bg-surface-2)'
                  }
                }}
              >
                {option.label}
              </Flex>
            ))}
          </Flex>
        ))}
      </MenuContent>
    )
  }

  return (
    <Flex className={styles.searchBar} css={{ position: 'relative' }}>
      <div
        ref={inputContainerRef}
        css={{
          position: 'relative',
          zIndex: 2,
          display: 'inline-block',
          width: inputValue ? '280px' : '160px',
          transition: 'width 0.2s ease-in-out'
        }}
      >
        <TextInput
          ref={inputRef}
          label={messages.searchPlaceholder}
          hideLabel
          size={TextInputSize.EXTRA_SMALL}
          value={inputValue}
          onChange={handleSearch}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={messages.searchPlaceholder}
          name='search'
          autoComplete='off'
          type='search'
          startIcon={IconSearch}
          css={{
            width: '100%',
            '& input': {
              fontSize: 'var(--harmony-font-xs)',
              fontWeight: 'var(--harmony-font-medium)',
              marginLeft: '2px',
              background: 'unset !important',
              color: 'var(--harmony-neutral) !important'
            },
            '& .contentContainer': {
              background: inputValue
                ? 'var(--harmony-white)'
                : 'var(--search-bar-background)',
              boxShadow: '0 2px 5px 0 var(--search-bar-shadow)',
              borderRadius: '4px',
              border: 'none',
              padding: '0 12px',
              height: '32px',
              minHeight: '32px'
            }
          }}
        />
        {isLoading && inputValue && (
          <Flex
            css={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              zIndex: 3
            }}
          >
            <LoadingSpinner size='s' />
          </Flex>
        )}
      </div>
      <Menu
        anchorRef={anchorRef}
        isVisible={shouldShowMenu}
        onClose={() => setIsMenuOpen(false)}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        dismissOnMouseLeave={false}
        zIndex={10000}
        className={cn(styles.searchBox, {
          [styles.searchBoxEmpty]: hasNoResults
        })}
        PaperProps={{
          css: {
            width: '280px',
            maxHeight: '560px'
          }
        }}
      >
        {renderMenuContent()}
      </Menu>
    </Flex>
  )
}
