import {
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import {
  Paper,
  Text,
  Flex,
  IconNote,
  IconAlbum,
  IconPlaylists,
  TextInput,
  TextInputSize,
  IconSearch,
  IconUser,
  Divider,
  FilterButton,
  useTheme
} from '@audius/harmony'
import { capitalize } from 'lodash'
import { useSearchParams } from 'react-router'
import { useDebounce, useEffectOnce, usePrevious } from 'react-use'

import exploreHeaderLanding from 'assets/img/explore-header-landing.png'
import { MIN_DESKTOP_CONTENT_WIDTH_PX } from 'common/utils/layout'
import Page from 'components/page/Page'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import useTabs from 'hooks/useTabs/useTabs'
import { filters } from 'pages/search-page/SearchFilters'
import { SearchResults } from 'pages/search-page/SearchResults'
import { SortMethodFilterButton } from 'pages/search-page/SortMethodFilterButton'
import { categories } from 'pages/search-page/categories'
import {
  useSearchCategory,
  useShowSearchResults
} from 'pages/search-page/hooks'
import {
  CategoryView,
  ViewLayout,
  viewLayoutOptions
} from 'pages/search-page/types'

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
import { RecommendedTracksSection } from './RecommendedTracksSection'
import { TopAlbumsThisMonthSection } from './TopAlbumsThisMonthSection'
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
  {
    icon: <IconSearch />,
    text: SearchTabs.ALL,
    label: SearchTabs.ALL
  },
  {
    icon: <IconUser />,
    text: SearchTabs.PROFILES,
    label: SearchTabs.PROFILES
  },
  {
    icon: <IconNote />,
    text: SearchTabs.TRACKS,
    label: SearchTabs.TRACKS
  },
  {
    icon: <IconAlbum />,
    text: SearchTabs.ALBUMS,
    label: SearchTabs.ALBUMS
  },
  {
    icon: <IconPlaylists />,
    text: SearchTabs.PLAYLISTS,
    label: SearchTabs.PLAYLISTS
  }
]

const DEBOUNCE_MS = 200
const NORMAL_WIDTH = 1200

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
  const [tracksLayout, setTracksLayout] = useState<ViewLayout>('list')
  const searchBarRef = useRef<HTMLInputElement>(null)
  const pageContentRef = useRef<HTMLDivElement>(null)
  const tabContainerRef = useRef<HTMLDivElement>(null)
  const { data: currentUserId, isLoading: isCurrentUserIdLoading } =
    useCurrentUserId()
  const { motion } = useTheme()
  const isNarrowLayout = useIsContainerNarrow(pageContentRef, 760)
  const isExtraNarrowLayout = useIsContainerNarrow(pageContentRef, 520)
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
    } else if (categoryKey === SearchTabs.ALL.toLowerCase()) {
      // clear filters when searching all
      const newParams = new URLSearchParams()
      if (debouncedValue) {
        newParams.set('query', debouncedValue)
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [
    debouncedValue,
    setSearchParams,
    searchParams,
    previousDebouncedValue,
    categoryKey
  ])

  const filterKeys: string[] = categories[categoryKey].filters

  const tabsWithDisplayMode = useMemo(
    () =>
      tabHeaders.map((tab) => ({
        ...tab,
        hideText: shouldHideTabText
      })),
    [shouldHideTabText]
  )

  const tabElements = useMemo(
    () => tabHeaders.map((tab) => <Flex key={tab.label}>{tab.text}</Flex>),
    []
  )

  const { tabs } = useTabs({
    isMobile: false,
    tabs: tabsWithDisplayMode,
    elements: tabElements,
    onTabClick: handleSearchTab,
    selectedTabLabel: capitalize(categoryKey)
  })
  const [bannerIsVisible, setBannerIsVisible] = useState(false)

  useEffect(() => {
    const img = new window.Image()
    img.src = exploreHeaderLanding
    img.onload = () => setBannerIsVisible(true)
  }, [])

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
      key: 'recommendedTracks',
      shouldRender: showTrackContent && showUserContextualContent,
      element: <RecommendedTracksSection />
    },
    {
      key: 'featuredPlaylists',
      shouldRender: showPlaylistContent,
      element: <FeaturedPlaylistsSection />
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

  const headerHeroPaddingX = isExtraNarrowLayout
    ? 'l'
    : isNarrowLayout
      ? 'xl'
      : 'unit14'

  return (
    <Page
      title={pageTitle}
      description={description}
      size='large'
      variant='flush'
    >
      <Flex justifyContent='center' w='100%'>
        <Flex
          ref={pageContentRef}
          direction='column'
          pv='3xl'
          ph='unit8'
          gap='3xl'
          alignItems='stretch'
          css={{
            minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX,
            width: '100%',
            maxWidth: NORMAL_WIDTH
          }}
        >
          {/* Header Section */}
          <Paper
            alignItems='center'
            direction='column'
            pv='xl'
            ph={headerHeroPaddingX}
            css={{
              minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX,
              backgroundImage: `url(${exploreHeaderLanding})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              opacity: bannerIsVisible ? 1 : 0,
              transition: `opacity ${motion.quick}`
            }}
            borderRadius='l'
            alignSelf='stretch'
          >
            <Flex direction='column' gap='m' alignItems='center'>
              <Text
                variant='display'
                size='s'
                color='staticWhite'
                textAlign='center'
                css={{
                  fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
                  lineHeight: 'clamp(2rem, 5.4vw, 2.5rem)'
                }}
              >
                {messages.explore}
              </Text>
              <Text
                variant='heading'
                size='s'
                color='staticWhite'
                textAlign='center'
                css={{
                  fontSize: 'clamp(1rem, 2.8vw, 1.5rem)',
                  lineHeight: 'clamp(1.25rem, 3.4vw, 1.75rem)',
                  fontWeight: 'var(--harmony-font-demi-bold)'
                }}
              >
                {messages.description}
              </Text>
            </Flex>
            <Flex mt='xl' w='100%' css={{ maxWidth: 400 }}>
              <TextInput
                ref={searchBarRef}
                label={messages.searchPlaceholder}
                value={inputValue}
                startIcon={IconSearch}
                size={TextInputSize.SMALL}
                onChange={handleSearch}
                onClear={handleClearSearch}
              />
            </Flex>
          </Paper>

          {/* Tabs and Filters */}
          <Flex
            direction='column'
            gap='l'
            css={{ minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX }}
          >
            <Flex direction='column'>
              <Flex
                ref={tabContainerRef}
                alignSelf='stretch'
                css={{
                  minWidth: 0
                }}
              >
                <Flex alignSelf='flex-start'>{tabs}</Flex>
              </Flex>
              <Divider orientation='horizontal' />
            </Flex>
            {filterKeys.length ? (
              isNarrowLayout ? (
                <Flex
                  direction='row'
                  alignItems='center'
                  gap='s'
                  wrap='wrap'
                  mv='m'
                >
                  {filterKeys.map((filterKey) => {
                    const FilterComponent =
                      filters[filterKey as keyof typeof filters]
                    return <FilterComponent key={filterKey} />
                  })}
                  <SortMethodFilterButton />
                  {categoryKey === CategoryView.TRACKS ? (
                    <FilterButton
                      value={tracksLayout}
                      variant='replaceLabel'
                      optionsLabel={messages.layoutOptionsLabel}
                      onChange={setTracksLayout}
                      options={viewLayoutOptions}
                    />
                  ) : null}
                </Flex>
              ) : (
                <Flex
                  direction='row'
                  justifyContent='space-between'
                  alignItems='center'
                  wrap='wrap'
                >
                  <Flex direction='row' gap='s' mv='m' wrap='wrap'>
                    {filterKeys.map((filterKey) => {
                      const FilterComponent =
                        filters[filterKey as keyof typeof filters]
                      return <FilterComponent key={filterKey} />
                    })}
                  </Flex>
                  <Flex gap='s'>
                    <SortMethodFilterButton />
                    {categoryKey === CategoryView.TRACKS ? (
                      <FilterButton
                        value={tracksLayout}
                        variant='replaceLabel'
                        optionsLabel={messages.layoutOptionsLabel}
                        onChange={setTracksLayout}
                        options={viewLayoutOptions}
                      />
                    ) : null}
                  </Flex>
                </Flex>
              )
            ) : null}
          </Flex>

          {/* Content Section */}
          {inputValue || showSearchResults ? (
            <SearchResults
              tracksLayout={tracksLayout}
              handleSearchTab={handleSearchTab}
            />
          ) : null}
          <Flex
            direction='column'
            gap='3xl'
            css={{
              minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX,
              overflowX: 'clip',
              overflowY: 'visible',
              display: showSearchResults ? 'none' : undefined
            }}
          >
            {sectionConfigs.map(({ key, shouldRender, element }) =>
              shouldRender ? <Fragment key={key}>{element}</Fragment> : null
            )}
          </Flex>
        </Flex>
      </Flex>
    </Page>
  )
}

export default SearchExplorePage
