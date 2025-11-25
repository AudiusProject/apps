import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ChangeEvent,
  useMemo
} from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import {
  Flex,
  TextInput,
  TextInputSize,
  IconSearch,
  RadioGroup,
  SelectablePill
} from '@audius/harmony'
import { capitalize } from 'lodash'
import { useSearchParams } from 'react-router-dom'
import { useDebounce, usePrevious } from 'react-use'

import BackgroundWaves from 'assets/img/publicSite/imageSearchHeaderBackground@2x.webp'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, { CenterPreset } from 'components/nav/mobile/NavContext'
import { SearchResults } from 'pages/search-page/SearchResults'
import { categories } from 'pages/search-page/categories'
import {
  useSearchCategory,
  useShowSearchResults
} from 'pages/search-page/hooks'
import {
  Category,
  CategoryKey,
  CategoryView,
  ViewLayout
} from 'pages/search-page/types'

import { ActiveDiscussionsSection } from '../desktop/ActiveDiscussionsSection'
import { ArtistSpotlightSection } from '../desktop/ArtistSpotlightSection'
import { BestSellingSection } from '../desktop/BestSellingSection'
import { DownloadsAvailableSection } from '../desktop/DownloadsAvailableSection'
import { FeaturedPlaylistsSection } from '../desktop/FeaturedPlaylistsSection'
import { FeaturedRemixContestsSection } from '../desktop/FeaturedRemixContestsSection'
import { FeelingLuckySection } from '../desktop/FeelingLuckySection'
import { LabelSpotlightSection } from '../desktop/LabelSpotlightSection'
import { MoodGrid } from '../desktop/MoodGrid'
import { MostSharedSection } from '../desktop/MostSharedSection'
import { QuickSearchGrid } from '../desktop/QuickSearchGrid'
import { RecentPremiumTracksSection } from '../desktop/RecentPremiumTracksSection'
import { RecentSearchesSection } from '../desktop/RecentSearchesSection'
import { RecentlyPlayedSection } from '../desktop/RecentlyPlayedSection'
import { RecommendedTracksSection } from '../desktop/RecommendedTracksSection'
import { TrendingPlaylistsSection } from '../desktop/TrendingPlaylistsSection'
import { UndergroundTrendingTracksSection } from '../desktop/UndergroundTrendingTracksSection'

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
  const [tracksLayout] = useState<ViewLayout>('list')
  const searchBarRef = useRef<HTMLInputElement>(null)
  const { data: currentUserId, isLoading: isCurrentUserIdLoading } =
    useCurrentUserId()

  const handleSearchTab = useCallback(
    (newTab: string) => {
      setCategory(newTab.toLowerCase() as CategoryView)
    },
    [setCategory]
  )

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

  const [, setBannerIsVisible] = useState(false)

  useEffect(() => {
    const img = new window.Image()
    img.src = BackgroundWaves
    img.onload = () => setBannerIsVisible(true)
  }, [])

  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  const handleCategoryChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setCategory(value as CategoryKey)
    },
    [setCategory]
  )

  const categoryList = useMemo(() => {
    const entries = Object.entries(categories)
    const allCategory = entries.find(([key]) => key === 'all')
    const currentCategory = entries.find(([key]) => key === categoryKey)
    const restCategories = entries.filter(
      ([key]) => key !== 'all' && key !== categoryKey
    )

    return [
      ...(allCategory ? [allCategory] : []),
      ...(currentCategory && currentCategory[0] !== 'all'
        ? [currentCategory]
        : []),
      ...restCategories
    ]
  }, [categoryKey])

  // Hide search header
  useEffect(() => {
    setRight(null)
    setCenter(CenterPreset.LOGO)
  }, [setLeft, setCenter, setRight])

  const showUserContextualContent = isCurrentUserIdLoading || !!currentUserId
  const showTrackContent = categoryKey === 'tracks' || categoryKey === 'all'
  const showPlaylistContent =
    categoryKey === 'playlists' || categoryKey === 'all'
  const showUserContent = categoryKey === 'profiles' || categoryKey === 'all'
  const showAlbumContent = categoryKey === 'albums' || categoryKey === 'all'

  return (
    <MobilePageContainer
      title={messages.explore}
      containerClassName='search-explore-page'
    >
      <Flex direction='column' w='100%' style={{ overflow: 'hidden' }}>
        <Flex direction='column' ph='l' pt='l' backgroundColor='surface1'>
          <TextInput
            ref={searchBarRef}
            label={messages.searchPlaceholder}
            value={inputValue}
            startIcon={IconSearch}
            size={TextInputSize.SMALL}
            onChange={handleSearch}
            onClear={handleClearSearch}
          />
          <RadioGroup
            direction='row'
            gap='s'
            aria-label={'Select search category'}
            name='searchcategory'
            value={categoryKey}
            onChange={handleCategoryChange}
            css={{
              overflow: 'scroll',
              // Hide scrollbar for IE, Edge, and Firefox
              msOverflowStyle: 'none', // IE and Edge
              scrollbarWidth: 'none', // Firefox
              marginLeft: '-50vw',
              marginRight: '-50vw',
              paddingLeft: '50vw',
              padding: '16px 50vw'
            }}
          >
            {categoryList.map(([key, category]) => (
              <SelectablePill
                isSelected={categoryKey === key}
                aria-label={`${key} search category`}
                icon={(category as Category).icon}
                key={key}
                label={capitalize(key)}
                name='searchCategory'
                size='large'
                type='radio'
                value={key}
              />
            ))}
          </RadioGroup>
        </Flex>
        {inputValue || showSearchResults ? (
          <SearchResults
            tracksLayout={tracksLayout}
            handleSearchTab={handleSearchTab}
          />
        ) : null}
        <Flex
          direction='column'
          mt='l'
          gap='2xl'
          css={{ display: showSearchResults ? 'none' : undefined }}
        >
          {showTrackContent && showUserContextualContent && (
            <RecommendedTracksSection />
          )}
          {showTrackContent && showUserContextualContent && (
            <RecentlyPlayedSection />
          )}
          <QuickSearchGrid />
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
          {(showAlbumContent || showTrackContent) && <BestSellingSection />}
          {showTrackContent && <RecentPremiumTracksSection />}
          {showTrackContent && showUserContextualContent && (
            <FeelingLuckySection />
          )}
          {showUserContextualContent && <RecentSearchesSection />}
        </Flex>
      </Flex>
    </MobilePageContainer>
  )
}

export default SearchExplorePage
