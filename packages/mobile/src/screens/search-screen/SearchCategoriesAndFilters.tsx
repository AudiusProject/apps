import { useCallback, useRef } from 'react'

import type {
  SearchFilter,
  SearchCategory as SearchCategoryType
} from '@audius/common/api'
import { labelByCategory } from '@audius/common/api'
import { useFocusEffect } from '@react-navigation/native'
import { ScrollView } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'

import {
  Flex,
  IconCloseAlt,
  SelectablePill,
  useTheme
} from '@audius/harmony-native'

import { BpmFilter } from './BpmFilter'
import {
  GenreFilter,
  HasDownloadsFilter,
  IsPremiumFilter,
  IsVerifiedFilter,
  KeyFilter,
  MoodFilter
} from './SearchFilters'
import { useSearchCategory, useSearchFilters } from './searchState'

type SearchCategoryProps = {
  category: SearchCategoryType
}

const AnimatedFlex = Animated.createAnimatedComponent(Flex)

const SearchCategory = (props: SearchCategoryProps) => {
  const { category } = props
  const [currentCategory, setCategory] = useSearchCategory()
  const [, setFilters] = useSearchFilters()
  const isSelected = currentCategory === category

  if (currentCategory !== 'all' && !isSelected) return null

  return (
    <SelectablePill
      type='radio'
      size='large'
      value={category}
      label={labelByCategory[category]}
      isSelected={isSelected}
      onChange={(value, isSelected) => {
        // Clear Filters and change category
        setFilters({})
        setCategory(isSelected ? (value as SearchCategoryType) : 'all')
      }}
      icon={isSelected ? IconCloseAlt : undefined}
      // Disable unselect animation when the category is selected
      // to avoid a flash of purple as the pills rearrange
      disableUnselectAnimation
    />
  )
}

const filtersByCategory: Record<SearchCategoryType, SearchFilter[]> = {
  all: [],
  users: ['genre', 'isVerified'],
  tracks: [
    'genre',
    'mood',
    'key',
    'bpm',
    'isPremium',
    'hasDownloads',
    'isVerified'
  ],
  albums: ['genre', 'mood', 'isPremium', 'hasDownloads', 'isVerified'],
  playlists: ['genre', 'mood', 'isVerified']
}

const searchFilterButtons = {
  genre: GenreFilter,
  mood: MoodFilter,
  key: KeyFilter,
  bpm: BpmFilter,
  isPremium: IsPremiumFilter,
  hasDownloads: HasDownloadsFilter,
  isVerified: IsVerifiedFilter
}

type SearchCategoriesAndFiltersProps = {
  animatedPaddingVertical?: SharedValue<number>
}

export const SearchCategoriesAndFilters = (
  props: SearchCategoriesAndFiltersProps
) => {
  const { animatedPaddingVertical } = props
  const [category] = useSearchCategory()
  const [filters] = useSearchFilters()
  const { spacing } = useTheme()

  const scrollViewRef = useRef<ScrollView>(null)

  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false })
    }, [])
  )

  const categoryFilters = filtersByCategory[category]
  const isPodcastGenre = filters.genre === 'Podcasts'
  
  // Filter out key and bpm when genre is Podcasts
  const availableFilters = isPodcastGenre
    ? categoryFilters.filter((key) => key !== 'key' && key !== 'bpm')
    : categoryFilters
  
  const activeFilterKeys = availableFilters.filter((key) =>
    Boolean(filters[key])
  )
  const inactiveFilterKeys = availableFilters.filter((key) => !filters[key])
  const sortedFilterKeys = [...activeFilterKeys, ...inactiveFilterKeys]

  const animatedStyle = useAnimatedStyle(() => ({
    paddingHorizontal: spacing.l,
    paddingVertical: animatedPaddingVertical
      ? animatedPaddingVertical.value
      : spacing.l
  }))

  return (
    <Flex>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps='handled'
        ref={scrollViewRef}
        showsHorizontalScrollIndicator={false}
      >
        <AnimatedFlex
          direction='row'
          alignItems='center'
          gap='s'
          style={animatedStyle}
        >
          <SearchCategory category='users' />
          <SearchCategory category='tracks' />
          <SearchCategory category='albums' />
          <SearchCategory category='playlists' />
          {sortedFilterKeys.map((filter) => {
            const SearchFilterButton = searchFilterButtons[filter]
            if (SearchFilterButton) {
              return <SearchFilterButton key={filter} />
            }
            return null
          })}
        </AnimatedFlex>
      </ScrollView>
    </Flex>
  )
}
