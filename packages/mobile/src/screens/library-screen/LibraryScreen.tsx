import { LibraryPageTabs } from '@audius/common/store'
import { View } from 'react-native'

import { IconAlbum, IconNote, IconPlaylists } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { TopTabNavigator } from 'app/components/top-tab-bar'
import { useAppTabScreen } from 'app/hooks/useAppTabScreen'
import { MobileRootHeader } from 'app/screens/app-screen/MobileRootHeader'
import { makeStyles } from 'app/styles'

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

const useStyles = makeStyles(({ palette }) => ({
  subHeader: {
    backgroundColor: palette.white
  }
}))

export const LibraryScreen = () => {
  useAppTabScreen()
  const styles = useStyles()

  return (
    <Screen
      header={() => (
        <MobileRootHeader title={messages.header} showDivider={false}>
          <LibraryDownloadSection />
        </MobileRootHeader>
      )}
    >
      <ScreenPrimaryContent>
        <View style={styles.subHeader}>
          <LibraryCategorySelectionMenu />
        </View>
      </ScreenPrimaryContent>
      <ScreenContent isOfflineCapable>
        <ScreenSecondaryContent>
          <TopTabNavigator
            screens={libraryScreens}
            screenOptions={{ lazy: true }}
          />
        </ScreenSecondaryContent>
      </ScreenContent>
    </Screen>
  )
}
