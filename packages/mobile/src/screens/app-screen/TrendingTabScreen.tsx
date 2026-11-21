import { TrendingScreen } from 'app/screens/trending-screen'
import { TrendingFilterButton } from 'app/screens/trending-screen/TrendingFilterButton'

import type { AppTabScreenParamList } from './AppTabScreen'
import { MobileRootHeader } from './MobileRootHeader'
import { createAppTabScreenStack } from './createAppTabScreenStack'

export type TrendingTabScreenParamList = AppTabScreenParamList & {
  Trending: undefined
}

const renderTrendingHeader = () => (
  <MobileRootHeader title='Trending Tracks' showDivider={false} hasSubHeader>
    <TrendingFilterButton />
  </MobileRootHeader>
)

export const TrendingTabScreen =
  createAppTabScreenStack<TrendingTabScreenParamList>((Stack) => (
    <Stack.Screen
      name='Trending'
      component={TrendingScreen}
      options={{
        header: renderTrendingHeader,
        headerShown: true,
        headerTransparent: true,
        contentStyle: { paddingTop: 0 }
      }}
    />
  ))
