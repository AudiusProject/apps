import { useCallback, useEffect, useRef, useState } from 'react'

import { useExploreContent } from '@audius/common/api'
import { ExploreCollectionsVariant } from '@audius/common/store'
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
import { useNavigate, useSearchParams } from 'react-router-dom-v5-compat'
import { useDebounce, useEffectOnce, usePrevious } from 'react-use'

import BackgroundWaves from 'assets/img/publicSite/imageSearchHeaderBackground@2x.webp'
import { CollectionCard } from 'components/collection'
import PerspectiveCard, {
  TextInterior
} from 'components/perspective-card/PerspectiveCard'
import { RemixContestCard } from 'components/remix-contest-card'
import { UserCard } from 'components/user-card'
import { useIsUSDCEnabled } from 'hooks/useIsUSDCEnabled'
import useTabs from 'hooks/useTabs/useTabs'
import {
  PREMIUM_TRACKS,
  TRENDING_PLAYLISTS,
  TRENDING_UNDERGROUND,
  DOWNLOADS_AVAILABLE
} from 'pages/explore-page/collections'
import { RecentSearches } from 'pages/search-page/RecentSearches'
import { SearchCatalogTile } from 'pages/search-page/SearchCatalogTile'
import { filters } from 'pages/search-page/SearchFilters'
import { SearchResults } from 'pages/search-page/SearchResults'
import { SortMethodFilterButton } from 'pages/search-page/SortMethodFilterButton'
import { categories } from 'pages/search-page/categories'
import {
  useSearchCategory,
  useShowSearchResults
} from 'pages/search-page/hooks'
import { MOODS } from 'pages/search-page/moods'
import {
  CategoryView,
  ViewLayout,
  viewLayoutOptions
} from 'pages/search-page/types'
import { BASE_URL, stripBaseUrl } from 'utils/route'

import { ExploreSection } from './ExploreSection'

export type ExplorePageProps = {
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

const messages = {
  explore: 'Explore',
  description: 'Discover new releases, fan favorites, and rising hits',
  searchPlaceholder: 'What do you want to listen to?',
  featuredPlaylists: 'Community Playlists',
  featuredRemixContests: 'Featured Remix Contests',
  artistSpotlight: 'Artist Spotlight',
  labelSpotlight: 'Label Spotlight',
  exploreByMood: 'Explore by Mood',
  bestOfAudius: 'Best of Audius',
  viewAll: 'View All',
  layoutOptionsLabel: 'View As'
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

const justForYou = [
  TRENDING_PLAYLISTS,
  TRENDING_UNDERGROUND,
  PREMIUM_TRACKS,
  DOWNLOADS_AVAILABLE
]
const DEBOUNCE_MS = 400

const ExplorePage = ({ title, pageTitle, description }: ExplorePageProps) => {
  const [categoryKey, setCategory] = useSearchCategory()
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputValue, setInputValue] = useState(searchParams.get('query') || '')
  const [debouncedValue, setDebouncedValue] = useState(inputValue)
  const previousDebouncedValue = usePrevious(debouncedValue)
  const isUSDCPurchasesEnabled = useIsUSDCEnabled()
  const navigate = useNavigate()
  const showSearchResults = useShowSearchResults()
  const [tracksLayout, setTracksLayout] = useState<ViewLayout>('list')
  const searchBarRef = useRef<HTMLInputElement>(null)
  const { color, motion } = useTheme()
  const { isLarge } = useMedia()

  const { data: exploreContent } = useExploreContent()

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

  const onClickCard = useCallback(
    (url: string) => {
      if (url.startsWith(BASE_URL)) {
        navigate(stripBaseUrl(url))
      } else if (url.startsWith('http')) {
        const win = window.open(url, '_blank')
        if (win) win.focus()
      } else {
        navigate(url)
      }
    },
    [navigate]
  )

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
      newParams.set('query', debouncedValue)
      setSearchParams(newParams)
    }
  }, [debouncedValue, setSearchParams, searchParams, previousDebouncedValue])

  const filterKeys: string[] = categories[categoryKey].filters
  const justForYouTiles = justForYou.filter((tile) => {
    const isPremiumTracksTile =
      tile.variant === ExploreCollectionsVariant.DIRECT_LINK &&
      tile.title === PREMIUM_TRACKS.title
    return !isPremiumTracksTile || isUSDCPurchasesEnabled
  })

  const { tabs } = useTabs({
    isMobile: false,
    tabs: tabHeaders,
    elements: tabHeaders.map((tab) => <Flex key={tab.label}>{tab.text}</Flex>),
    onTabClick: handleSearchTab,
    selectedTabLabel: capitalize(categoryKey)
  })
  const [bannerIsVisible, setBannerIsVisible] = useState(false)

  useEffect(() => {
    const img = new window.Image()
    img.src = BackgroundWaves
    img.onload = () => setBannerIsVisible(true)
  }, [])

  return (
    <Flex justifyContent='center'>
      <Flex
        direction='column'
        pv='3xl'
        ph='unit15'
        gap='3xl'
        alignItems='stretch'
        w={isLarge ? '95%' : 1200}
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
          <Flex w={400}>
            <TextInput
              ref={searchBarRef}
              width={400}
              label={messages.searchPlaceholder}
              value={inputValue}
              size={TextInputSize.DEFAULT}
              startIcon={IconSearch}
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
            >
              <Flex direction='row' gap='s' mv='m'>
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
        {!showSearchResults && categoryKey !== 'all' ? (
          <Flex direction='column' alignItems='center' gap={'xl'}>
            <SearchCatalogTile />
            <RecentSearches />
          </Flex>
        ) : inputValue || showSearchResults ? (
          <SearchResults
            tracksLayout={tracksLayout}
            handleSearchTab={handleSearchTab}
          />
        ) : (
          <>
            <ExploreSection
              title={messages.featuredPlaylists}
              data={exploreContent?.featuredPlaylists}
              Card={CollectionCard}
            />
            <ExploreSection
              title={messages.featuredRemixContests}
              data={exploreContent?.featuredRemixContests}
              Card={RemixContestCard}
            />

            <ExploreSection
              title={messages.artistSpotlight}
              data={exploreContent?.featuredProfiles}
              Card={UserCard}
            />

            <ExploreSection
              title={messages.labelSpotlight}
              data={exploreContent?.featuredLabels}
              Card={UserCard}
            />

            {/* Explore by mood */}
            <Flex direction='column' gap='l' alignItems='center'>
              <Text variant='heading'>{messages.exploreByMood}</Text>
              <Flex
                gap='m'
                justifyContent='center'
                alignItems='flex-start'
                wrap='wrap'
              >
                {Object.entries(MOODS)
                  .sort()
                  .map(([mood, moodInfo]) => (
                    <Paper
                      key={mood}
                      pv='l'
                      ph='xl'
                      gap='m'
                      borderRadius='m'
                      border='default'
                      backgroundColor='white'
                      onClick={() => {
                        navigate(`/search/tracks?mood=${mood}`)
                      }}
                      css={{
                        ':hover': {
                          background: color.neutral.n100,
                          border: `1px solid ${color.neutral.n150}`
                        }
                      }}
                    >
                      {moodInfo.icon}
                      <Text variant='title' size='s'>
                        {moodInfo.label}
                      </Text>
                    </Paper>
                  ))}
              </Flex>
            </Flex>

            {/* Just For You */}
            <Flex direction='column' gap='l'>
              <Text variant='heading'>{messages.bestOfAudius}</Text>
              <Flex
                wrap='wrap'
                gap='l'
                direction='row'
                justifyContent='space-between'
              >
                {justForYouTiles.map((tile) => {
                  const Icon = tile.icon
                  return (
                    <PerspectiveCard
                      key={tile.title}
                      backgroundGradient={tile.gradient}
                      shadowColor={tile.shadow}
                      useOverlayBlendMode={
                        tile.variant !== ExploreCollectionsVariant.DIRECT_LINK
                      }
                      backgroundIcon={
                        Icon ? (
                          <Icon height={180} width={180} color='inverse' />
                        ) : undefined
                      }
                      onClick={() => onClickCard(tile.link)}
                      isIncentivized={!!tile.incentivized}
                      sensitivity={tile.cardSensitivity}
                    >
                      <Flex w={532} h={200}>
                        <TextInterior
                          title={tile.title}
                          subtitle={tile.subtitle}
                        />
                      </Flex>
                    </PerspectiveCard>
                  )
                })}
              </Flex>
            </Flex>
          </>
        )}
      </Flex>
    </Flex>
  )
}

export default ExplorePage
