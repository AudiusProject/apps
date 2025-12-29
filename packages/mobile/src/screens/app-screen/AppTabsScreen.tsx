import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { NavigatorScreenParams } from '@react-navigation/native'

import { lazyScreenNamed } from 'app/utils/lazyScreen'

import { usePhantomConnect } from '../external-wallets/usePhantomConnect'

import { AppTabBar } from './AppTabBar'
import type { ExploreTabScreenParamList } from './ExploreTabScreen'
import type { FavoritesTabScreenParamList } from './FavoritesTabScreen'
import type { FeedTabScreenParamList } from './FeedTabScreen'
import type { ProfileTabScreenParamList } from './ProfileTabScreen'
import type { TrendingTabScreenParamList } from './TrendingTabScreen'
import { usePrefetchNotifications } from './usePrefetchNotifications'

// Lazy load tab screens
const FeedTabScreen = lazyScreenNamed(
  () => import('./FeedTabScreen'),
  'FeedTabScreen'
)
const TrendingTabScreen = lazyScreenNamed(
  () => import('./TrendingTabScreen'),
  'TrendingTabScreen'
)
const ExploreTabScreen = lazyScreenNamed(
  () => import('./ExploreTabScreen'),
  'ExploreTabScreen'
)
const FavoritesTabScreen = lazyScreenNamed(
  () => import('./FavoritesTabScreen'),
  'FavoritesTabScreen'
)
const NotificationsTabScreen = lazyScreenNamed(
  () => import('./NotificationsTabScreen'),
  'NotificationsTabScreen'
)

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

  return (
    <Tab.Navigator tabBar={tabBar} screenOptions={screenOptions}>
      <Tab.Screen name='feed' component={FeedTabScreen} />
      <Tab.Screen name='trending' component={TrendingTabScreen} />
      <Tab.Screen name='explore' component={ExploreTabScreen} />
      <Tab.Screen name='library' component={FavoritesTabScreen} />
      <Tab.Screen name='notifications' component={NotificationsTabScreen} />
    </Tab.Navigator>
  )
}
