import { TrendingScreen } from 'app/screens/trending-screen'
import { TrendingFilterButton } from 'app/screens/trending-screen/TrendingFilterButton'

import type { AppTabScreenParamList } from './AppTabScreen'
import { MobileRootHeader } from './MobileRootHeader'
import { createAppTabScreenStack } from './createAppTabScreenStack'

export type TrendingTabScreenParamList = AppTabScreenParamList & {
  Trending: undefined
}

// Pre-declare the header so React Navigation uses custom-header layout
// (content at y=0, header overlaid on top) from the very first native frame.
// Without this, the stack shows the default nav bar on frame 1, then
// TrendingScreen's useLayoutEffect fires and replaces it with MobileRootHeader
// — the switch from native-bar positioning to custom-header positioning causes
// a visible double-shift of the content.
const renderTrendingHeader = () => (
  <MobileRootHeader title='Trending Tracks' showDivider={false}>
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
        // Matches TrendingScreen's own `headerTransparent` so the very first
        // native frame already floats the header — otherwise the pre-declared
        // header lays out in flow and the content shifts once the screen's
        // setOptions lands.
        headerTransparent: true,
        contentStyle: { paddingTop: 0 }
      }}
    />
  ))
