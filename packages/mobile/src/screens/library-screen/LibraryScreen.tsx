import { useCallback } from 'react'

import { LibraryPageTabs } from '@audius/common/store'
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs'

import {
  Flex,
  IconAlbum,
  IconNote,
  IconPlaylists,
  SelectablePill
} from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { TopTabNavigator } from 'app/components/top-tab-bar'
import { TopTabBar } from 'app/components/top-tab-bar/TopTabBar'
import { FloatingSubHeader } from 'app/screens/app-screen/FloatingSubHeader'
import { MobileRootHeader } from 'app/screens/app-screen/MobileRootHeader'

import { AlbumsTab } from './AlbumsTab'
import { LibraryCategorySelectionMenu } from './LibraryCategorySelectionMenu'
import { LibraryDownloadSection } from './LibraryDownloadSection'
import { PlaylistsTab } from './PlaylistsTab'
import { TracksTab } from './TracksTab'

const messages = {
  header: 'Library'
}

const libraryScreens = [
  {
    name: LibraryPageTabs.TRACKS,
    Icon: IconNote,
    component: TracksTab
  },
  {
    name: LibraryPageTabs.ALBUMS,
    Icon: IconAlbum,
    component: AlbumsTab
  },
  {
    name: LibraryPageTabs.PLAYLISTS,
    Icon: IconPlaylists,
    component: PlaylistsTab
  }
]

/**
 * Category pills and the Tracks / Albums / Playlists tabs, as the header's
 * scroll-away row. The tab bar floats over the tab lists, which pad their own
 * content to start below it.
 */
const LibraryTabBar = (props: MaterialTopTabBarProps) => {
  const { state, navigation } = props

  const compactTabs = (
    <Flex direction='row' alignItems='center' gap='s'>
      {state.routes.map((route, index) => (
        <SelectablePill
          key={route.key}
          type='radio'
          size='large'
          value={route.name}
          label={route.name}
          isSelected={state.index === index}
          onChange={(value, isSelected) => {
            if (isSelected) navigation.navigate(value)
          }}
          disableUnselectAnimation
        />
      ))}
    </Flex>
  )

  return (
    <FloatingSubHeader padded={false} compact={compactTabs}>
      <LibraryCategorySelectionMenu />
      <TopTabBar {...props} />
    </FloatingSubHeader>
  )
}

const renderLibraryTabBar = (props: MaterialTopTabBarProps) => (
  <LibraryTabBar {...props} />
)

export const LibraryScreen = () => {
  const renderHeader = useCallback(
    () => (
      <MobileRootHeader
        title={messages.header}
        showDivider={false}
        hasSubHeader
      >
        <LibraryDownloadSection />
      </MobileRootHeader>
    ),
    []
  )

  return (
    <Screen header={renderHeader} headerTransparent>
      <ScreenPrimaryContent>{null}</ScreenPrimaryContent>
      <ScreenContent isOfflineCapable>
        <ScreenSecondaryContent>
          <TopTabNavigator
            screens={libraryScreens}
            screenOptions={{ lazy: true }}
            tabBar={renderLibraryTabBar}
          />
        </ScreenSecondaryContent>
      </ScreenContent>
    </Screen>
  )
}
