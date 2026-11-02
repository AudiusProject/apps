import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { NavigatorScreenParams } from '@react-navigation/native'

import { BottomBarInsetContext } from 'app/components/core/BottomBarInsetContext'
import { useBottomChinHeight } from 'app/components/core/BottomChin'

import { usePhantomConnect } from '../external-wallets/usePhantomConnect'

import { AppTabBar } from './AppTabBar'
import type { ExploreTabScreenParamList } from './ExploreTabScreen'
import { ExploreTabScreen } from './ExploreTabScreen'
import type { FavoritesTabScreenParamList } from './FavoritesTabScreen'
import { FavoritesTabScreen } from './FavoritesTabScreen'
import type { FeedTabScreenParamList } from './FeedTabScreen'
import { FeedTabScreen } from './FeedTabScreen'
import { NotificationsTabScreen } from './NotificationsTabScreen'
import type { ProfileTabScreenParamList } from './ProfileTabScreen'
import { TabBarAutoHideProvider } from './TabBarAutoHideContext'
import type { TrendingTabScreenParamList } from './TrendingTabScreen'
import { TrendingTabScreen } from './TrendingTabScreen'
import { usePrefetchNotifications } from './usePrefetchNotifications'

export type AppScreenParamList = {
  feed: NavigatorScreenParams<FeedTabScreenParamList>
  trending: NavigatorScreenParams<TrendingTabScreenParamList>
  explore: NavigatorScreenParams<ExploreTabScreenParamList>
  favorites: NavigatorScreenParams<FavoritesTabScreenParamList>
  profile: NavigatorScreenParams<ProfileTabScreenParamList>
}

const Tab = createBottomTabNavigator()

const screenOptions = { headerShown: false }
const tabBar = (props: BottomTabBarProps) => <AppTabBar {...props} />

export const AppTabsScreen = () => {
  usePhantomConnect((route) => route?.params?.params?.params ?? ({} as any))
  usePrefetchNotifications()
  const bottomBarInset = useBottomChinHeight()

  return (
    // Sits above the navigator so the tab bar, which renders as a sibling of
    // the screens, can still animate off the focused tab's scrolling.
    <BottomBarInsetContext.Provider value={bottomBarInset}>
      <TabBarAutoHideProvider>
        <Tab.Navigator
          tabBar={tabBar}
          screenOptions={screenOptions}
          initialRouteName='feed'
        >
          <Tab.Screen name='feed' component={FeedTabScreen} />
          <Tab.Screen name='trending' component={TrendingTabScreen} />
          <Tab.Screen name='explore' component={ExploreTabScreen} />
          <Tab.Screen name='library' component={FavoritesTabScreen} />
          <Tab.Screen name='notifications' component={NotificationsTabScreen} />
        </Tab.Navigator>
      </TabBarAutoHideProvider>
    </BottomBarInsetContext.Provider>
  )
}
