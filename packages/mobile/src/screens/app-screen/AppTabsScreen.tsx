import { useEffect, useState } from 'react'

import type { SearchCategory, SearchFiltersType } from '@audius/common/api'
import { walletActions } from '@audius/common/store'
import { useAppState } from '@react-native-community/hooks'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useRoute, type NavigatorScreenParams } from '@react-navigation/native'
import { useDispatch } from 'react-redux'

import { usePhantomConnect } from '../external-wallets/usePhantomConnect'
import { SearchContext } from '../search-screen/searchState'

import { AppTabBar } from './AppTabBar'
import type { ExploreTabScreenParamList } from './ExploreTabScreen'
import { ExploreTabScreen } from './ExploreTabScreen'
import type { FavoritesTabScreenParamList } from './FavoritesTabScreen'
import { FavoritesTabScreen } from './FavoritesTabScreen'
import type { FeedTabScreenParamList } from './FeedTabScreen'
import { FeedTabScreen } from './FeedTabScreen'
import { NotificationsTabScreen } from './NotificationsTabScreen'
import type { ProfileTabScreenParamList } from './ProfileTabScreen'
import type { TrendingTabScreenParamList } from './TrendingTabScreen'
import { TrendingTabScreen } from './TrendingTabScreen'
import { usePrefetchNotifications } from './usePrefetchNotifications'
const { getBalance } = walletActions

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
  const dispatch = useDispatch()
  const appState = useAppState()
  usePhantomConnect((route) => route?.params?.params?.params ?? ({} as any))
  usePrefetchNotifications()

  useEffect(() => {
    if (appState === 'active') {
      dispatch(getBalance())
    }
  }, [appState, dispatch])

  const { params } = useRoute<'Search'>()

  const [autoFocus, setAutoFocus] = useState(params?.autoFocus ?? false)
  const [query, setQuery] = useState(params?.query ?? '')
  const [category, setCategory] = useState<SearchCategory>(
    params?.category ?? 'all'
  )
  const [filters, setFilters] = useState<SearchFiltersType>(
    params?.filters ?? {}
  )
  const [bpmType, setBpmType] = useState<'range' | 'target'>('range')

  useEffect(() => {
    setQuery(params?.query ?? '')
    setCategory(params?.category ?? 'all')
    setFilters(params?.filters ?? {})
    setAutoFocus(params?.autoFocus ?? false)
  }, [params])

  return (
    <SearchContext.Provider
      value={{
        autoFocus,
        setAutoFocus,
        query,
        setQuery,
        category,
        setCategory,
        filters,
        setFilters,
        bpmType,
        setBpmType,
        active: true
      }}
    >
      <Tab.Navigator tabBar={tabBar} screenOptions={screenOptions}>
        <Tab.Screen name='feed' component={FeedTabScreen} />
        <Tab.Screen name='trending' component={TrendingTabScreen} />
        <Tab.Screen name='explore' component={ExploreTabScreen} />
        <Tab.Screen name='library' component={FavoritesTabScreen} />
        <Tab.Screen name='notifications' component={NotificationsTabScreen} />
      </Tab.Navigator>
    </SearchContext.Provider>
  )
}
