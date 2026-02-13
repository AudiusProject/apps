import type { SearchCategory, SearchFilters } from '@audius/common/api'

import { SearchExploreScreen } from '../explore-screen/SearchExploreScreen'
import { TrendingUndergroundScreen } from '../explore-screen/tabs/ForYouTab/TrendingUndergroundScreen'

import type { AppTabScreenParamList } from './AppTabScreen'
import { createAppTabScreenStack } from './createAppTabScreenStack'

export type ExploreTabScreenParamList = AppTabScreenParamList & {
  SearchExplore: {
    autoFocus?: boolean
    query?: string
    category?: SearchCategory
    filters?: SearchFilters
  }
  TrendingUnderground: undefined
}

export const ExploreTabScreen =
  createAppTabScreenStack<ExploreTabScreenParamList>((Stack) => {
    return (
      <>
        <Stack.Screen name='SearchExplore' component={SearchExploreScreen} />
        <Stack.Screen
          name='TrendingUnderground'
          component={TrendingUndergroundScreen}
        />
      </>
    )
  })
