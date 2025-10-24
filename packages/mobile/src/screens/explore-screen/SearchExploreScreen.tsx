import React, { useEffect, useRef } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { Platform } from 'react-native'
import { IOScrollView } from 'react-native-intersection-observer'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'

import { useTheme } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
import { useScrollToTop } from 'app/hooks/useScrollToTop'
import { useStatusBarStyle } from 'app/hooks/useStatusBarStyle'

import { SearchResults } from '../search-screen/search-results/SearchResults'
import {
  SearchProvider,
  useSearchCategory,
  useSearchFilters,
  useSearchQuery,
  useSearchAutoFocus
} from '../search-screen/searchState'

import { ExploreContent } from './components/ExploreContent'
import { SearchExploreHeader } from './components/SearchExploreHeader'
import { useExploreRoute } from './hooks'

const AnimatedIOScrollView = Animated.createAnimatedComponent(IOScrollView)

// Animation parameters
const HEADER_SLIDE_HEIGHT = 46
const FILTER_SCROLL_THRESHOLD = 300
export const SCROLL_FACTOR = Platform.OS === 'ios' ? 1 : 3

const SearchExploreContent = () => {
  const { spacing, motion } = useTheme()
  const { params } = useExploreRoute<'SearchExplore'>()

  // Set status bar to light content for dark header
  useStatusBarStyle('light-content')

  // Get state from context
  const [, setCategory] = useSearchCategory()
  const [filters, setFilters] = useSearchFilters()
  const [query, setQuery] = useSearchQuery()
  const [, setAutoFocus] = useSearchAutoFocus()
  // Animation state
  const scrollY = useSharedValue(0)
  const filterTranslateY = useSharedValue(0)
  const prevScrollY = useSharedValue(0)
  const scrollDirection = useSharedValue<'up' | 'down'>('down')
  const scrollRef = useRef<Animated.ScrollView>(null)

  // Feature flag for collapsed header
  const { isEnabled: isCollapsedHeaderEnabled } = useFeatureFlag(
    FeatureFlags.COLLAPSED_EXPLORE_HEADER
  )

  // Derived data
  const hasAnyFilter = Object.values(filters).some(
    (value) => value !== undefined
  )

  // Sync route params into search state when they change (e.g. in-app URL navigation)
  useEffect(() => {
    if (params?.category) setCategory(params.category)
    if (params?.filters) setFilters(params.filters)
    if (params?.query !== undefined) setQuery(params.query)
    if (params?.autoFocus !== undefined) setAutoFocus(!!params.autoFocus)
  }, [params, setCategory, setFilters, setQuery, setAutoFocus])

  useScrollToTop(() => {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: false
    })
    setQuery('')
    setCategory('all')
    setFilters({})
  })

  useEffect(() => {
    if (query.length <= 1) {
      // Reset scroll on new or empty queries
      scrollRef.current?.scrollTo?.({ y: 0, animated: false })
    }
  })

  // Animations
  const contentPaddingStyle = useAnimatedStyle(() => {
    // Clamped scroll prevents jitter
    return {
      paddingTop:
        query || params?.autoFocus
          ? withTiming(-HEADER_SLIDE_HEIGHT, motion.calm)
          : interpolate(
              scrollY.value,
              [0, 80 * SCROLL_FACTOR],
              [0, 80],
              Extrapolation.CLAMP
            )
    }
  })

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y
      const contentHeight = event.contentSize.height
      const layoutHeight = event.layoutMeasurement.height
      const isAtBottom = y + layoutHeight >= contentHeight
      const canScroll = contentHeight > layoutHeight

      // Only apply scroll animations if there's enough content to scroll
      // fixes jitter when content is small
      if (!canScroll) {
        scrollY.value = 0
        return
      }

      // Only update scroll direction if we're not at the bottom
      // to prevent bounce from interfering
      if (!isAtBottom) {
        if (y > prevScrollY.value) {
          scrollDirection.value = 'down'
        } else if (y < prevScrollY.value) {
          scrollDirection.value = 'up'
        }
      }
      prevScrollY.value = y
      scrollY.value = y

      // Handle filter animation
      if (y > FILTER_SCROLL_THRESHOLD && scrollDirection.value === 'down') {
        filterTranslateY.value = withTiming(-spacing['4xl'], motion.calm)
      } else if (
        y < FILTER_SCROLL_THRESHOLD ||
        scrollDirection.value === 'up'
      ) {
        filterTranslateY.value = withTiming(0, motion.calm)
      }
    }
  })

  const showSearch = Boolean(query || hasAnyFilter)
  return (
    <ScreenContent>
      <SearchExploreHeader
        scrollY={scrollY}
        filterTranslateY={filterTranslateY}
        scrollRef={scrollRef}
      />
      {showSearch ? (
        <SearchResults />
      ) : (
        <AnimatedIOScrollView
          ref={scrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={isCollapsedHeaderEnabled ? undefined : contentPaddingStyle}
          showsVerticalScrollIndicator={false}
        >
          <ExploreContent />
        </AnimatedIOScrollView>
      )}
    </ScreenContent>
  )
}

export const SearchExploreScreen = () => {
  const { params } = useExploreRoute<'SearchExplore'>()

  return (
    <SearchProvider
      initialCategory={(params?.category as any) ?? 'all'}
      initialFilters={params?.filters ?? {}}
      initialAutoFocus={params?.autoFocus ?? false}
      initialQuery={params?.query ?? ''}
    >
      <Screen url='Explore' header={() => <></>}>
        <SearchExploreContent />
      </Screen>
    </SearchProvider>
  )
}
