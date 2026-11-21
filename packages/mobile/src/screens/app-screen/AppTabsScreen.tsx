import { useCallback, useEffect, useState } from 'react'

import { playbackSelectors } from '@audius/common/store'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { NavigatorScreenParams } from '@react-navigation/native'
import { Modal, StyleSheet, View } from 'react-native'
import { useSelector } from 'react-redux'

import { BottomBarInsetProvider } from 'app/components/core/BottomBarInsetProvider'
import { FoldLayoutProvider, useFoldLayout } from 'app/components/fold'
import { Gatefold } from 'app/components/now-playing-panel/Gatefold'
import { NowPlayingPanel } from 'app/components/now-playing-panel/NowPlayingPanel'
import { ContentWidthContext } from 'app/hooks/useContentWidth'

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

const { getTrackId } = playbackSelectors

const Tab = createBottomTabNavigator()

const PANEL_MAX_WIDTH = 420
const PANEL_WIDTH_RATIO = 0.42

const screenOptions = { headerShown: false }
const tabBar = (props: BottomTabBarProps) => <AppTabBar {...props} />

export const AppTabsScreen = () => {
  usePhantomConnect((route) => route?.params?.params?.params ?? ({} as any))
  usePrefetchNotifications()

  return (
    <FoldLayoutProvider>
      <BottomBarInsetProvider>
        <TabBarAutoHideProvider>
          <SplitLayout />
        </TabBarAutoHideProvider>
      </BottomBarInsetProvider>
    </FoldLayoutProvider>
  )
}

const SplitLayout = () => {
  const { isWide, posture, windowWidth } = useFoldLayout()
  const hasTrack = !!useSelector(getTrackId)
  const [isGatefoldDismissed, setIsGatefoldDismissed] = useState(false)

  useEffect(() => {
    if (posture !== 'book') setIsGatefoldDismissed(false)
  }, [posture])

  const handleCloseGatefold = useCallback(() => {
    setIsGatefoldDismissed(true)
  }, [])

  const showPanel = isWide && hasTrack
  const panelWidth =
    posture === 'book'
      ? Math.round(windowWidth / 2)
      : Math.min(PANEL_MAX_WIDTH, Math.round(windowWidth * PANEL_WIDTH_RATIO))
  const showGatefold = posture === 'book' && hasTrack && !isGatefoldDismissed

  return (
    <View style={styles.row}>
      <ContentWidthContext.Provider
        value={showPanel ? windowWidth - panelWidth : null}
      >
        <View style={styles.content}>
          <Tab.Navigator
            tabBar={tabBar}
            screenOptions={screenOptions}
            initialRouteName='feed'
          >
            <Tab.Screen name='feed' component={FeedTabScreen} />
            <Tab.Screen name='trending' component={TrendingTabScreen} />
            <Tab.Screen name='explore' component={ExploreTabScreen} />
            <Tab.Screen name='library' component={FavoritesTabScreen} />
            <Tab.Screen
              name='notifications'
              component={NotificationsTabScreen}
            />
          </Tab.Navigator>
        </View>
      </ContentWidthContext.Provider>
      {showPanel && !showGatefold ? (
        <NowPlayingPanel width={panelWidth} />
      ) : null}
      <Modal
        visible={showGatefold}
        animationType='fade'
        presentationStyle='fullScreen'
        onRequestClose={handleCloseGatefold}
      >
        <Gatefold width={windowWidth} onClose={handleCloseGatefold} />
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row'
  },
  content: {
    flex: 1,
    overflow: 'hidden'
  }
})
