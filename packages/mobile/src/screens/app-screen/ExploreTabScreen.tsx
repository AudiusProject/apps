import type { SearchCategory, SearchFilters } from '@audius/common/api'

import { lazyScreenNamed } from 'app/utils/lazyScreen'

import type { AppTabScreenParamList } from './AppTabScreen'
import { createAppTabScreenStack } from './createAppTabScreenStack'

// Lazy load nested explore screens
const SearchExploreScreen = lazyScreenNamed(
  () => import('../explore-screen/SearchExploreScreen'),
  'SearchExploreScreen'
)
const TrendingPlaylistsScreen = lazyScreenNamed(
  () => import('../explore-screen/tabs/ForYouTab/TrendingPlaylistsScreen'),
  'TrendingPlaylistsScreen'
)
const TrendingUndergroundScreen = lazyScreenNamed(
  () => import('../explore-screen/tabs/ForYouTab/TrendingUndergroundScreen'),
  'TrendingUndergroundScreen'
)

export type ExploreTabScreenParamList = AppTabScreenParamList & {
  SearchExplore: {
    autoFocus?: boolean
    query?: string
    category?: SearchCategory
    filters?: SearchFilters
  }
  TrendingPlaylists: undefined
  TrendingUnderground: undefined
}

export const ExploreTabScreen =
  createAppTabScreenStack<ExploreTabScreenParamList>((Stack) => {
    return (
      <>
        <Stack.Screen name='SearchExplore' component={SearchExploreScreen} />
        <Stack.Screen
          name='TrendingPlaylists'
          component={TrendingPlaylistsScreen}
        />
        <Stack.Screen
          name='TrendingUnderground'
          component={TrendingUndergroundScreen}
        />
      </>
    )
  })
