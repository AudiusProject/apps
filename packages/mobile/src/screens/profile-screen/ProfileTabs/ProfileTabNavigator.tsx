import type { ReactElement } from 'react'

import { useProfileUser } from '@audius/common/api'
import { useIsArtist } from '@audius/common/hooks'
import { ProfilePageTabs } from '@audius/common/store'

import {
  IconAlbum,
  IconNote,
  IconPlaylists,
  IconRepost
} from '@audius/harmony-native'
import {
  collapsibleTabScreen,
  CollapsibleTabNavigator
} from 'app/components/top-tab-bar'
import { useRoute } from 'app/hooks/useRoute'

import { AlbumsTab } from './AlbumsTab'
import { PlaylistsTab } from './PlaylistsTab'
import { RepostsTab } from './RepostsTab'
import { TracksTab } from './TracksTab'

// Height of a typical profile header
const INITIAL_PROFILE_HEADER_HEIGHT = 1081

type ProfileTabNavigatorProps = {
  /**
   * Function that renders the collapsible header
   */
  renderHeader: () => ReactElement
  refreshing?: boolean
  onRefresh?: () => void
}

export const ProfileTabNavigator = ({
  renderHeader,
  refreshing,
  onRefresh
}: ProfileTabNavigatorProps) => {
  const { user_id } =
    useProfileUser({
      select: (user) => ({ user_id: user.user_id })
    }).user ?? {}
  const { params } = useRoute<'Profile'>()

  const initialParams = {
    id: user_id,
    handle: params.handle
  }
  const isArtist = useIsArtist(params)

  const trackScreen = collapsibleTabScreen({
    name: ProfilePageTabs.TRACKS,
    Icon: IconNote,
    component: TracksTab,
    initialParams,
    refreshing,
    onRefresh
  })

  const albumsScreen = collapsibleTabScreen({
    name: ProfilePageTabs.ALBUMS,
    Icon: IconAlbum,
    component: AlbumsTab,
    initialParams,
    refreshing,
    onRefresh
  })

  const playlistsScreen = collapsibleTabScreen({
    name: ProfilePageTabs.PLAYLISTS,
    Icon: IconPlaylists,
    component: PlaylistsTab,
    initialParams,
    refreshing,
    onRefresh
  })

  const repostsScreen = collapsibleTabScreen({
    name: ProfilePageTabs.REPOSTS,
    Icon: IconRepost,
    component: RepostsTab,
    initialParams: isArtist ? { ...initialParams, lazy: true } : initialParams,
    refreshing,
    onRefresh
  })

  if (isArtist) {
    return (
      <CollapsibleTabNavigator
        renderHeader={renderHeader}
        headerHeight={INITIAL_PROFILE_HEADER_HEIGHT}
      >
        {trackScreen}
        {albumsScreen}
        {playlistsScreen}
        {repostsScreen}
      </CollapsibleTabNavigator>
    )
  }

  return (
    <CollapsibleTabNavigator
      renderHeader={renderHeader}
      headerHeight={INITIAL_PROFILE_HEADER_HEIGHT}
    >
      {repostsScreen}
      {playlistsScreen}
    </CollapsibleTabNavigator>
  )
}
