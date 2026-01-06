import React, {
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
    <Flex
      alignItems='center'
      justifyContent='center'
      w='100%'
      css={{ padding: '16px 0' }}
    >
      <PlainButton
        iconRight={IconArrowRight}
        onClick={() => navigate(searchResultsPage('all', query))}
        className='dropdown-action'
        css={{
          '&:hover': {
            '& > *': {
              color: 'var(--harmony-text-icon-default)'
            }
          }
        }}
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
    <Flex
      alignItems='center'
      justifyContent='center'
      w='100%'
      css={{ padding: '8px 0' }}
    >
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

const RecentSearchesEmptyState = () => (
  <Flex
    alignItems='center'
    justifyContent='center'
    direction='column'
    gap='s'
    p='s'
  >
    <Text variant='body' size='s' color='subdued'>
      No recent searches
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
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isFocused, setIsFocused] = useState(false)
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

  const handleClear = useCallback(() => {
    setInputValue('')
    inputRef.current?.focus()
  }, [])

  const handleSelect = useCallback(() => {
    setInputValue('')
    setIsMenuOpen(false)
  }, [])

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
    if (inputValue) return []

    if (!searchHistory.length) {
      return [
        {
          label: 'Recent Searches',
          options: [
            {
              label: <RecentSearchesEmptyState />,
              value: 'empty-state' as any
            }
          ]
        }
      ]
    }

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
          {
            label: <ClearRecentSearchesButton />,
            value: 'Clear search'
          }
        ]
      }
    ]

    return baseOptions
  }, [handleClickClear, inputValue, searchHistory])

  const options = data ? autocompleteOptions : recentSearchOptions
  const hasOptions = options.length > 0
  const showResults = !isSearchPage && hasOptions
  const shouldShowMenu = isMenuOpen && showResults

  // Flatten all options for keyboard navigation
  const flatOptions = useMemo(() => {
    const flat: Array<{ value: string; isSelectable: boolean }> = []
    options.forEach((group) => {
      group.options.forEach((option) => {
        const value = String(option.value ?? '')
        flat.push({
          value,
          isSelectable: value !== 'no-results' && value !== 'empty-state'
        })
      })
    })
    return flat
  }, [options])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!shouldShowMenu) {
        if (event.key === 'Enter') {
          if (isSearchPage) {
            const newParams = new URLSearchParams(searchParams)
            newParams.set('query', debouncedValue)
            setSearchParams(newParams)
          } else {
            navigate(searchResultsPage('all', inputValue))
          }
        }
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) => {
          if (prev < flatOptions.length - 1) {
            return prev + 1
          }
          return 0 // Wrap to first
        })
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => {
          if (prev > 0) {
            return prev - 1
          }
          return flatOptions.length - 1 // Wrap to last
        })
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < flatOptions.length) {
          const selectedOption = flatOptions[selectedIndex]
          if (selectedOption.isSelectable) {
            // Find the actual option and trigger its action
            let optionIndex = 0
            for (const group of options) {
              for (const opt of group.options) {
                if (optionIndex === selectedIndex) {
                  const value = String(opt.value ?? '')
                  if (value === 'viewMore' && inputValue) {
                    navigate(searchResultsPage('all', inputValue))
                    handleSelect()
                  } else if (value === 'Clear search') {
                    dispatch(clearHistory())
                  } else {
                    // This is a search result - find the link and click it
                    const linkElement = document.querySelector(
                      `[data-search-result-value="${value}"]`
                    ) as HTMLElement
                    if (linkElement) {
                      linkElement.click()
                      handleSelect()
                    }
                  }
                  return
                }
                optionIndex++
              }
            }
          }
        } else {
          // No selection, navigate to search page
          if (isSearchPage) {
            const newParams = new URLSearchParams(searchParams)
            newParams.set('query', debouncedValue)
            setSearchParams(newParams)
          } else {
            navigate(searchResultsPage('all', inputValue))
          }
        }
      } else if (event.key === 'Escape') {
        setIsMenuOpen(false)
        setSelectedIndex(-1)
      }
    },
    [
      shouldShowMenu,
      flatOptions,
      selectedIndex,
      options,
      inputValue,
      navigate,
      isSearchPage,
      searchParams,
      setSearchParams,
      debouncedValue,
      dispatch,
      handleSelect
    ]
  )

  // Reset selected index when options change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [options])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && scrollRef.current) {
      const selectedElement = scrollRef.current.querySelector(
        `[data-option-index="${selectedIndex}"]`
      ) as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [selectedIndex])
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
    } else if (!inputValue && !hasOptions) {
      setIsMenuOpen(false)
    }
  }, [hasOptions, inputValue])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    setIsMenuOpen(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    // Delay closing to allow clicks on menu items
    setTimeout(() => {
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
    let currentIndex = 0
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
                size='s'
                color='default'
                css={{ paddingLeft: '8px' }}
              >
                {group.label}
              </Text>
            )}
            {group.options.map((option, optionIndex) => {
              const isSelected = currentIndex === selectedIndex
              const index = currentIndex++
              const value = String(option.value ?? '')
              const isSelectable =
                value !== 'no-results' && value !== 'empty-state'

              const enhancedLabel =
                isSelectable && React.isValidElement(option.label)
                  ? React.cloneElement(
                      option.label as React.ReactElement<{
                        isSelected: boolean
                      }>,
                      {
                        isSelected
                      }
                    )
                  : option.label

              return (
                <Flex
                  key={`${groupIndex}-${optionIndex}-${value}`}
                  data-option-index={index}
                  onClick={() => {
                    if (
                      option.value !== 'viewMore' &&
                      option.value !== 'no-results' &&
                      option.value !== 'empty-state'
                    ) {
                      handleSelect()
                    }
                  }}
                  borderRadius='s'
                  css={{
                    cursor: isSelectable ? 'pointer' : 'default',
                    minHeight: '20px',
                    '&:hover': isSelectable
                      ? {
                          '& svg': {
                            opacity: '1'
                          }
                        }
                      : {}
                  }}
                >
                  {enhancedLabel}
                </Flex>
              )
            })}
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
          width:
            (inputValue && isFocused) || (isMenuOpen && hasOptions)
              ? '280px'
              : '160px',
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
          onClear={!isLoading && inputValue ? handleClear : undefined}
          css={{
            width: '100%',
            '& input': {
              fontSize: 'var(--harmony-font-xs)',
              fontWeight: 'var(--harmony-font-medium)',
              marginLeft: '2px',
              background: 'unset !important',
              color: 'var(--harmony-neutral) !important'
            },
            '& input[type="search"]::-webkit-search-cancel-button': {
              display: 'none',
              appearance: 'none',
              WebkitAppearance: 'none'
            },
            '& input[type="search"]::-ms-clear': {
              display: 'none'
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
              zIndex: 4
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
