import { IconAlbum, IconLibrary, IconNote } from '@audius/harmony-native'
import { Screen, ScreenContent, ScreenHeader } from 'app/components/core'
import { TopTabNavigator } from 'app/components/top-tab-bar'
import { useAppTabScreen } from 'app/hooks/useAppTabScreen'
import { makeStyles } from 'app/styles'

import { FavoritesDownloadSection } from './FavoritesDownloadSection'
import { LibraryCategorySelectionMenu } from './LibraryCategorySelectionMenu'
import { TracksTabWrapper } from './TracksTab'

const messages = {
  header: 'Library'
}

const favoritesScreens = [
  {
    name: 'tracks',
    Icon: IconNote,
    component: TracksTabWrapper
  },
  {
    name: 'albums',
    Icon: IconAlbum,
    component: () => null
  }
  // {
  //   name: 'playlists',
  //   Icon: IconPlaylists,
  //   component: PlaylistsTab
  // }
]

const useHeaderStyles = makeStyles(({ spacing }) => ({
  root: {
    flexWrap: 'wrap',
    height: 88,
    paddingVertical: spacing(2)
  }
}))

export const FavoritesScreen = () => {
  useAppTabScreen()
  const headerStyles = useHeaderStyles()

  return (
    <Screen>
      <ScreenHeader
        text={messages.header}
        icon={IconLibrary}
        styles={headerStyles}
      >
        <FavoritesDownloadSection />
        <LibraryCategorySelectionMenu />
      </ScreenHeader>
      <ScreenContent isOfflineCapable>
        <TopTabNavigator
          screens={favoritesScreens}
          screenOptions={{ lazy: true }}
        />
      </ScreenContent>
    </Screen>
  )
}
