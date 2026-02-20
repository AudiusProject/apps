import { TrendingScreen } from 'app/screens/trending-screen'

import type { AppTabScreenParamList } from './AppTabScreen'
import { createAppTabScreenStack } from './createAppTabScreenStack'

export type TrendingTabScreenParamList = AppTabScreenParamList & {
  Trending: undefined
}

export const TrendingTabScreen =
  createAppTabScreenStack<TrendingTabScreenParamList>((Stack) => (
    <Stack.Screen
      name='Trending'
      component={TrendingScreen}
      options={{ contentStyle: { paddingTop: 0 } }}
    />
  ))
