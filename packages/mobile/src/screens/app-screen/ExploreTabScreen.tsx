import type { SearchCategory, SearchFilters } from '@audius/common/api'

import { SearchExploreScreen } from '../explore-screen/SearchExploreScreen'

import type { AppTabScreenParamList } from './AppTabScreen'
import { createAppTabScreenStack } from './createAppTabScreenStack'

export type ExploreTabScreenParamList = AppTabScreenParamList & {
  SearchExplore: {
    autoFocus?: boolean
    query?: string
    category?: SearchCategory
    filters?: SearchFilters
  }
}

export const ExploreTabScreen =
  createAppTabScreenStack<ExploreTabScreenParamList>((Stack) => {
    return (
      <>
        <Stack.Screen name='SearchExplore' component={SearchExploreScreen} />
      </>
    )
  })
