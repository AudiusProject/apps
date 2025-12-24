import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

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
  useTheme,
  useMedia
} from '@audius/harmony'
import { capitalize } from 'lodash'
import { useSearchParams } from 'react-router'
import { useDebounce, useEffectOnce, usePrevious } from 'react-use'

import BackgroundWaves from 'assets/img/publicSite/imageSearchHeaderBackground@2x.webp'
import Page from 'components/page/Page'
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

import { ActiveDiscussionsSection } from './ActiveDiscussionsSection'
import { ArtistCoinTracksSection } from './ArtistCoinTracksSection'
import { ArtistSpotlightSection } from './ArtistSpotlightSection'
import { BestSellingSection } from './BestSellingSection'
import { DownloadsAvailableSection } from './DownloadsAvailableSection'
import { FeaturedPlaylistsSection } from './FeaturedPlaylistsSection'
import { FeaturedRemixContestsSection } from './FeaturedRemixContestsSection'
import { FeelingLuckySection } from './FeelingLuckySection'
import { LabelSpotlightSection } from './LabelSpotlightSection'
import { MoodGrid } from './MoodGrid'
import { MostSharedSection } from './MostSharedSection'
import { QuickSearchGrid } from './QuickSearchGrid'
import { RecentPremiumTracksSection } from './RecentPremiumTracksSection'
import { RecentSearchesSection } from './RecentSearchesSection'
import { RecentlyPlayedSection } from './RecentlyPlayedSection'
import { RecommendedTracksSection } from './RecommendedTracksSection'
import { TrendingPlaylistsSection } from './TrendingPlaylistsSection'
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
const MIN_WIDTH = 840
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
  const { data: currentUserId, isLoading: isCurrentUserIdLoading } =
    useCurrentUserId()
  const { motion } = useTheme()
  const { isLarge } = useMedia()
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
      setSearchParams(newParams)
    } else if (categoryKey === SearchTabs.ALL.toLowerCase()) {
      // clear filters when searching all
      const newParams = new URLSearchParams()
      if (debouncedValue) {
        newParams.set('query', debouncedValue)
      }
      setSearchParams(newParams)
    }
  }, [
    debouncedValue,
    setSearchParams,
    searchParams,
    previousDebouncedValue,
    categoryKey
  ])

  const filterKeys: string[] = categories[categoryKey].filters

  const tabElements = useMemo(
    () => tabHeaders.map((tab) => <Flex key={tab.label}>{tab.text}</Flex>),
    []
  )

  const { tabs } = useTabs({
    isMobile: false,
    tabs: tabHeaders,
    elements: tabElements,
    onTabClick: handleSearchTab,
    selectedTabLabel: capitalize(categoryKey)
  })
  const [bannerIsVisible, setBannerIsVisible] = useState(false)

  useEffect(() => {
    const img = new window.Image()
    img.src = BackgroundWaves
    img.onload = () => setBannerIsVisible(true)
  }, [])

  const showUserContextualContent = isCurrentUserIdLoading || !!currentUserId
  const showTrackContent = categoryKey === 'tracks' || categoryKey === 'all'
  const showPlaylistContent =
    categoryKey === 'playlists' || categoryKey === 'all'
  const showUserContent = categoryKey === 'profiles' || categoryKey === 'all'
  const showAlbumContent = categoryKey === 'albums' || categoryKey === 'all'

  return (
    <Page
      title={pageTitle}
      description={description}
      size='large'
      variant='flush'
    >
      <Flex
        justifyContent='center'
        css={{
          minWidth: isLarge ? MIN_WIDTH : NORMAL_WIDTH
        }}
      >
        <Flex
          direction='column'
          pv='3xl'
          ph='unit15'
          gap='3xl'
          alignItems='stretch'
          css={{
            minWidth: isLarge ? MIN_WIDTH : NORMAL_WIDTH,
            maxWidth: isLarge ? '100%' : NORMAL_WIDTH
          }}
        >
          {/* Header Section */}
          <Paper
            alignItems='center'
            direction='column'
            gap='xl'
            pv='xl'
            ph='unit14'
            css={{
              backgroundImage: `url(${BackgroundWaves})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              opacity: bannerIsVisible ? 1 : 0,
              transition: `opacity ${motion.quick}`
            }}
            borderRadius='l'
            alignSelf='stretch'
          >
            <Text variant='display' size='s' color='staticWhite'>
              {messages.explore}
            </Text>
            <Text
              variant='heading'
              size='s'
              color='staticWhite'
              textAlign='center'
            >
              {messages.description}
            </Text>
            <Flex w='100%' css={{ maxWidth: 400 }}>
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
          <Flex direction='column' gap='l'>
            <Flex direction='column'>
              <Flex alignSelf='flex-start'>{tabs}</Flex>
              <Divider orientation='horizontal' />
            </Flex>
            {filterKeys.length ? (
              <Flex
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                css={{ flexWrap: 'wrap' }}
              >
                <Flex direction='row' gap='s' mv='m' css={{ flexWrap: 'wrap' }}>
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
            css={{ display: showSearchResults ? 'none' : undefined }}
          >
            {showTrackContent && showUserContextualContent && (
              <RecommendedTracksSection />
            )}
            {showTrackContent && <ArtistCoinTracksSection />}
            {showTrackContent && showUserContextualContent && (
              <RecentlyPlayedSection />
            )}
            {showTrackContent && <QuickSearchGrid />}
            {showPlaylistContent && <FeaturedPlaylistsSection />}
            {showTrackContent && <FeaturedRemixContestsSection />}
            {showTrackContent && <UndergroundTrendingTracksSection />}
            {showUserContent && <ArtistSpotlightSection />}
            {showUserContent && <LabelSpotlightSection />}
            {showTrackContent && (
              <>
                <ActiveDiscussionsSection />
                <DownloadsAvailableSection />
              </>
            )}
            {(showTrackContent || showAlbumContent || showPlaylistContent) && (
              <MoodGrid />
            )}
            {showPlaylistContent && <TrendingPlaylistsSection />}
            {showTrackContent && <MostSharedSection />}
            {(showTrackContent || showAlbumContent) && <BestSellingSection />}
            {showTrackContent && <RecentPremiumTracksSection />}
            {showTrackContent && showUserContextualContent && (
              <FeelingLuckySection />
            )}
            {showUserContextualContent && <RecentSearchesSection />}
          </Flex>
        </Flex>
      </Flex>
    </Page>
  )
}

export default SearchExplorePage
