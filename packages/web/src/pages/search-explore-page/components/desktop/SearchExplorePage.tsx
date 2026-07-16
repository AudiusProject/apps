import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import {
  Flex,
  IconNote,
  IconAlbum,
  IconPlaylists,
  TextInput,
  TextInputSize,
  IconSearch,
  IconUser
} from '@audius/harmony'
import { capitalize } from 'lodash'
import { useSearchParams } from 'react-router'
import { useDebounce, useEffectOnce, usePrevious } from 'react-use'

import { MIN_DESKTOP_CONTENT_WIDTH_PX } from 'common/utils/layout'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { Tab, TabList } from 'components/tabs'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import { filters } from 'pages/search-page/SearchFilters'
import { SearchResults } from 'pages/search-page/SearchResults'
import { SortMethodFilterButton } from 'pages/search-page/SortMethodFilterButton'
import { categories } from 'pages/search-page/categories'
import {
  useSearchCategory,
  useShowSearchResults
} from 'pages/search-page/hooks'
import { CategoryView } from 'pages/search-page/types'

import { ArtistSpotlightSection } from './ArtistSpotlightSection'
import { BestSellingAlbumsSection } from './BestSellingAlbumsSection'
import { FanClubsExploreSection } from './FanClubsExploreSection'
import { FeaturedPlaylistsSection } from './FeaturedPlaylistsSection'
import { FeaturedRemixContestsSection } from './FeaturedRemixContestsSection'
import { FeelingLuckySection } from './FeelingLuckySection'
import { LabelSpotlightSection } from './LabelSpotlightSection'
import { MoodGrid } from './MoodGrid'
import { NewAlbumReleasesSection } from './NewAlbumReleasesSection'
import { QuickSearchGrid } from './QuickSearchGrid'
import { RecentSearchesSection } from './RecentSearchesSection'
import { RecentlyPlayedSection } from './RecentlyPlayedSection'
import { TopAlbumsThisMonthSection } from './TopAlbumsThisMonthSection'
import { TrendingGenresSection } from './TrendingGenresSection'
import { UndergroundTrendingTracksSection } from './UndergroundTrendingTracksSection'

export type SearchExplorePageProps = {
  title: string
  pageTitle: string
  description: string
}
export enum SearchTabs {
  ALL = 'All',
  PROFILES = 'Profiles',
  TRACKS = 'Tracks',
  ALBUMS = 'Albums',
  PLAYLISTS = 'Playlists'
}

const tabHeaders = [
  { value: SearchTabs.ALL, icon: <IconSearch />, text: SearchTabs.ALL },
  { value: SearchTabs.PROFILES, icon: <IconUser />, text: SearchTabs.PROFILES },
  { value: SearchTabs.TRACKS, icon: <IconNote />, text: SearchTabs.TRACKS },
  { value: SearchTabs.ALBUMS, icon: <IconAlbum />, text: SearchTabs.ALBUMS },
  {
    value: SearchTabs.PLAYLISTS,
    icon: <IconPlaylists />,
    text: SearchTabs.PLAYLISTS
  }
]

const DEBOUNCE_MS = 200

const SearchExplorePage = ({
  title,
  pageTitle,
  description
}: SearchExplorePageProps) => {
  const [categoryKey, setCategory] = useSearchCategory()
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputValue, setInputValue] = useState(searchParams.get('query') || '')
  const [debouncedValue, setDebouncedValue] = useState(inputValue)
  const previousDebouncedValue = usePrevious(debouncedValue)
  const showSearchResults = useShowSearchResults()
  const searchBarRef = useRef<HTMLInputElement>(null)
  const pageContentRef = useRef<HTMLDivElement>(null)
  const tabContainerRef = useRef<HTMLDivElement>(null)
  const { data: currentUserId, isLoading: isCurrentUserIdLoading } =
    useCurrentUserId()
  const isNarrowLayout = useIsContainerNarrow(pageContentRef, 760)
  const shouldHideTabText = useIsContainerNarrow(tabContainerRef, 552)
  const handleSearchTab = useCallback(
    (newTab: string) => {
      setCategory(newTab.toLowerCase() as CategoryView)
    },
    [setCategory]
  )

  useEffectOnce(() => {
    if (inputValue && searchBarRef.current) {
      searchBarRef.current.focus()
    }
  })

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value)
    },
    []
  )

  const handleClearSearch = useCallback(() => {
    setInputValue('')
  }, [])

  useDebounce(
    () => {
      setDebouncedValue(inputValue)
    },
    DEBOUNCE_MS,
    [inputValue]
  )

  useEffect(() => {
    if (debouncedValue !== previousDebouncedValue) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedValue) {
        newParams.set('query', debouncedValue)
      } else {
        newParams.delete('query')
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedValue, setSearchParams, searchParams, previousDebouncedValue])

  const filterKeys: string[] = categories[categoryKey].filters

  const tabs = (
    <TabList value={capitalize(categoryKey)} onChange={handleSearchTab}>
      {tabHeaders.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          icon={tab.icon}
          hideText={shouldHideTabText}
        >
          {tab.text}
        </Tab>
      ))}
    </TabList>
  )

  const showUserContextualContent = isCurrentUserIdLoading || !!currentUserId
  const showTrackContent =
    categoryKey === CategoryView.TRACKS || categoryKey === CategoryView.ALL
  const showPlaylistContent =
    categoryKey === CategoryView.PLAYLISTS || categoryKey === CategoryView.ALL
  const showUserContent =
    categoryKey === CategoryView.PROFILES || categoryKey === CategoryView.ALL
  const isTracksTab = categoryKey === CategoryView.TRACKS
  const isPlaylistsTab = categoryKey === CategoryView.PLAYLISTS
  const isAlbumsTab = categoryKey === CategoryView.ALBUMS
  const showAlbumContent = isAlbumsTab
  const sectionConfigs: {
    key: string
    shouldRender: boolean
    element: ReactNode
  }[] = [
    {
      key: 'featuredPlaylists',
      shouldRender: showPlaylistContent,
      element: <FeaturedPlaylistsSection />
    },
    {
      key: 'trendingGenres',
      shouldRender: showTrackContent,
      element: <TrendingGenresSection />
    },
    {
      key: 'topAlbumsThisMonth',
      shouldRender: showAlbumContent,
      element: <TopAlbumsThisMonthSection />
    },
    {
      key: 'newAlbumReleases',
      shouldRender: showAlbumContent,
      element: <NewAlbumReleasesSection />
    },
    {
      key: 'bestSellingAlbums',
      shouldRender: showAlbumContent,
      element: <BestSellingAlbumsSection />
    },
    {
      key: 'featuredRemixContests',
      shouldRender: showTrackContent,
      element: <FeaturedRemixContestsSection />
    },
    {
      key: 'fanClubs',
      shouldRender: categoryKey === CategoryView.ALL,
      element: <FanClubsExploreSection />
    },
    {
      key: 'quickSearch',
      shouldRender: isTracksTab,
      element: <QuickSearchGrid />
    },
    {
      key: 'recentlyPlayed',
      shouldRender: showTrackContent && showUserContextualContent,
      element: <RecentlyPlayedSection />
    },
    {
      key: 'undergroundTrendingTracks',
      shouldRender: isTracksTab,
      element: <UndergroundTrendingTracksSection />
    },
    {
      key: 'artistSpotlight',
      shouldRender: showUserContent,
      element: <ArtistSpotlightSection />
    },
    {
      key: 'labelSpotlight',
      shouldRender: showUserContent,
      element: <LabelSpotlightSection />
    },
    {
      key: 'moodGrid',
      shouldRender: isTracksTab || isPlaylistsTab || isAlbumsTab,
      element: <MoodGrid />
    },
    {
      key: 'feelingLucky',
      shouldRender: showTrackContent && showUserContextualContent,
      element: <FeelingLuckySection />
    },
    {
      key: 'recentSearches',
      shouldRender: showUserContextualContent,
      element: <RecentSearchesSection />
    }
  ]

  const header = (
    <Header
      primary={messages.explore}
      icon={IconSearch}
      bottomBar={
        <Flex ref={tabContainerRef} alignSelf='stretch' css={{ minWidth: 0 }}>
          <Flex alignSelf='flex-start'>{tabs}</Flex>
        </Flex>
      }
    />
  )

  const subHeader = (
    <Flex
      column
      w='100%'
      ph='2xl'
      pv='m'
      css={{
        borderTop: '1px solid var(--harmony-n-100)',
        background: 'color-mix(in srgb, var(--harmony-n-950) 3%, transparent)',
        alignSelf: 'stretch'
      }}
    >
      <Flex
        column
        gap='m'
        css={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}
      >
        <TextInput
          ref={searchBarRef}
          label={messages.searchPlaceholder}
          value={inputValue}
          startIcon={IconSearch}
          size={TextInputSize.SMALL}
          onChange={handleSearch}
          onClear={handleClearSearch}
        />
        {filterKeys.length ? (
          <Flex
            direction='row'
            justifyContent={isNarrowLayout ? undefined : 'space-between'}
            alignItems='center'
            gap='s'
            wrap='wrap'
          >
            <Flex direction='row' gap='s' wrap='wrap'>
              {filterKeys.map((filterKey) => {
                const FilterComponent =
                  filters[filterKey as keyof typeof filters]
                return <FilterComponent key={filterKey} />
              })}
            </Flex>
            <Flex gap='s'>
              <SortMethodFilterButton />
            </Flex>
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  )

  return (
    <Page
      title={pageTitle}
      description={description}
      size='large'
      header={header}
      subHeader={subHeader}
      showSearch={false}
      disableHeaderFrosted
      frostedHeaderContainer
    >
      <Flex
        ref={pageContentRef}
        direction='column'
        gap='3xl'
        alignItems='stretch'
        css={{ minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX, width: '100%' }}
      >
        {/* Content Section */}
        {inputValue || showSearchResults ? (
          <SearchResults handleSearchTab={handleSearchTab} />
        ) : null}
        <Flex
          direction='column'
          gap='3xl'
          css={{
            minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX,
            overflowX: 'clip',
            overflowY: 'visible',
            display: inputValue || showSearchResults ? 'none' : undefined
          }}
        >
          {sectionConfigs.map(({ key, shouldRender, element }) =>
            shouldRender ? <Fragment key={key}>{element}</Fragment> : null
          )}
        </Flex>
      </Flex>
    </Page>
  )
}

export default SearchExplorePage
