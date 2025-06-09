import { useCallback, useContext, useEffect } from 'react'

import type {
  FavoriteType,
  TipSource,
  ID,
  SearchTrack,
  SearchPlaylist
} from '@audius/common/models'
import type {
  NotificationType,
  RepostType,
  CreateChatModalState,
  TrackMetadataForUpload
} from '@audius/common/store'
import type { EventArg, NavigationState } from '@react-navigation/native'
import type { createNativeStackNavigator } from '@react-navigation/native-stack'

import { FilterButtonScreen } from '@audius/harmony-native'
import type { FilterButtonScreenParams } from '@audius/harmony-native'
import { useDrawer } from 'app/hooks/useDrawer'
import { setLastNavAction } from 'app/hooks/useNavigation'
import { AiGeneratedTracksScreen } from 'app/screens/ai-generated-tracks-screen'
import { AppDrawerContext } from 'app/screens/app-drawer-screen'
import { AudioScreen } from 'app/screens/audio-screen'
import {
  BuySellScreen,
  ConfirmSwapScreen,
  TransactionResultScreen
} from 'app/screens/buy-sell-screen'
import { ChangeEmailModalScreen } from 'app/screens/change-email-screen/ChangeEmailScreen'
import { ChatListScreen } from 'app/screens/chat-screen/ChatListScreen'
import { ChatScreen } from 'app/screens/chat-screen/ChatScreen'
import { ChatUserListScreen } from 'app/screens/chat-screen/ChatUserListScreen'
import { CollectionScreen } from 'app/screens/collection-screen/CollectionScreen'
import { EditProfileScreen } from 'app/screens/edit-profile-screen'
import { SearchExploreScreen } from 'app/screens/explore-screen/SearchExploreScreen'
import { PayAndEarnScreen } from 'app/screens/pay-and-earn-screen'
import { ProfileScreen } from 'app/screens/profile-screen'
import { RewardsScreen } from 'app/screens/rewards-screen'
import type { SearchParams } from 'app/screens/search-screen'
import {
  AboutScreen,
  AccountSettingsScreen,
  AccountVerificationScreen,
  ListeningHistoryScreen,
  DownloadSettingsScreen,
  InboxSettingsScreen,
  CommentSettingsScreen,
  NotificationSettingsScreen,
  SettingsScreen
} from 'app/screens/settings-screen'
import { TrackScreen } from 'app/screens/track-screen'
import { TrackRemixesScreen } from 'app/screens/track-screen/TrackRemixesScreen'
import {
  FavoritedScreen,
  FollowersScreen,
  FollowingScreen,
  RepostsScreen,
  NotificationUsersScreen,
  MutualsScreen,
  RelatedArtistsScreen,
  TopSupportersScreen,
  SupportingUsersScreen
} from 'app/screens/user-list-screen'
import { WalletScreen } from 'app/screens/wallet-screen'

import { useAppScreenOptions } from './useAppScreenOptions'

export type AppTabScreenParamList = {
  Track: {
    searchTrack?: SearchTrack
    canBeUnlisted?: boolean
    showComments?: boolean
  } & ({ handle: string; slug: string } | { trackId: ID })
  TrackRemixes: { trackId: ID } | { handle: string; slug: string }
  Profile: { handle: string; id?: ID } | { handle?: string; id: ID }
  Collection: {
    id?: ID
    slug?: string
    searchCollection?: SearchPlaylist
    collectionType?: 'playlist' | 'album'
    handle?: string
  }
  EditCollection: { id: ID }
  Favorited: { id: ID; favoriteType: FavoriteType }
  Reposts: { id: ID; repostType: RepostType }
  Followers: { userId: ID }
  Following: { userId: ID }
  Mutuals: { userId: ID }
  AiGeneratedTracks: { userId: ID }
  RelatedArtists: { userId: ID }
  Search: SearchParams
  SearchResults: { query: string }
  SupportingUsers: { userId: ID }
  TagSearch: { query: string }
  TopSupporters: { userId: ID; source: TipSource }
  NotificationUsers: {
    notification: any
    notificationType: NotificationType
    count: number
  }
  TipArtist: undefined
  SettingsScreen: undefined
  AboutScreen: undefined
  ListeningHistoryScreen: undefined
  AccountSettingsScreen: undefined
  AccountVerificationScreen: undefined
  ChangeEmail: undefined
  ChangePassword: undefined
  BuySellScreen: undefined
  ConfirmSwapScreen: undefined
  TransactionResultScreen: undefined
  InboxSettingsScreen: undefined
  CommentSettingsScreen: undefined
  DownloadSettingsScreen: undefined
  NotificationSettingsScreen: undefined
  PayAndEarnScreen: undefined
  AudioScreen: undefined
  RewardsScreen: undefined
  wallet: undefined
  Upload: {
    initialMetadata?: Partial<TrackMetadataForUpload>
  }
  FeatureFlagOverride: undefined
  CreateChatBlast: undefined
  EditTrack: { id: ID }
  ExternalWallets: undefined
  ChatList: undefined
  ChatUserList:
    | {
        presetMessage?: string
        defaultUserList?: CreateChatModalState['defaultUserList']
      }
    | undefined
  Chat: {
    chatId: string
    presetMessage?: string
  }
  ChatBlastSelectContent: {
    valueName: string
    title: string
    searchLabel: string
    content: { label: string; value: string }[]
  }
  FilterButton: FilterButtonScreenParams
}

type NavigationStateEvent = EventArg<
  'state',
  false,
  { state: NavigationState<AppTabScreenParamList> }
>

type AppTabScreenProps = {
  baseScreen: (
    Stack: ReturnType<typeof createNativeStackNavigator>
  ) => React.ReactNode
  Stack: ReturnType<typeof createNativeStackNavigator>
}

/**
 * This is the base tab screen that includes common screens
 * like track and profile
 */
export const AppTabScreen = ({ baseScreen, Stack }: AppTabScreenProps) => {
  const screenOptions = useAppScreenOptions()
  const { drawerNavigation } = useContext(AppDrawerContext)
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')

  const handleChangeState = useCallback(
    (event: NavigationStateEvent) => {
      const stackRoutes = event?.data?.state?.routes
      const isStackUnopened = stackRoutes.length === 1
      const isStackOpened = stackRoutes.length === 2

      if (isStackUnopened) {
        drawerNavigation?.setOptions({ swipeEnabled: true })
      }
      if (isStackOpened) {
        drawerNavigation?.setOptions({ swipeEnabled: false })
      }
    },
    [drawerNavigation]
  )

  /**
   * Reset lastNavAction on transitionEnd
   * Need to do this via screenListeners on the Navigator because listening
   * via navigation.addListener inside a screen does not always
   * catch events from other screens
   */
  const handleTransitionEnd = useCallback(() => {
    setLastNavAction(undefined)
  }, [])

  useEffect(() => {
    drawerNavigation?.setOptions({ swipeEnabled: !isNowPlayingDrawerOpen })
  }, [drawerNavigation, isNowPlayingDrawerOpen])

  return (
    <Stack.Navigator
      screenOptions={screenOptions}
      screenListeners={{
        state: handleChangeState,
        transitionEnd: handleTransitionEnd
      }}
    >
      {baseScreen(Stack)}
      <Stack.Screen name='Track' component={TrackScreen} />
      <Stack.Screen name='TrackRemixes' component={TrackRemixesScreen} />
      <Stack.Screen name='Collection' component={CollectionScreen} />
      <Stack.Screen name='Profile' component={ProfileScreen} />
      <Stack.Screen
        name='Search'
        component={SearchExploreScreen}
        options={{ ...screenOptions, headerShown: false }}
      />
      <Stack.Group>
        <Stack.Screen name='Followers' component={FollowersScreen} />
        <Stack.Screen name='Following' component={FollowingScreen} />
        <Stack.Screen name='Favorited' component={FavoritedScreen} />
        <Stack.Screen
          name='AiGeneratedTracks'
          component={AiGeneratedTracksScreen}
        />
        <Stack.Screen name='Mutuals' component={MutualsScreen} />
        <Stack.Screen name='RelatedArtists' component={RelatedArtistsScreen} />
        <Stack.Screen
          name='NotificationUsers'
          component={NotificationUsersScreen}
        />
      </Stack.Group>
      <Stack.Screen name='Reposts' component={RepostsScreen} />
      <Stack.Screen name='TopSupporters' component={TopSupportersScreen} />
      <Stack.Screen name='SupportingUsers' component={SupportingUsersScreen} />
      <Stack.Screen name='PayAndEarnScreen' component={PayAndEarnScreen} />
      <Stack.Screen name='AudioScreen' component={AudioScreen} />
      <Stack.Screen name='RewardsScreen' component={RewardsScreen} />
      <Stack.Screen name='wallet' component={WalletScreen} />

      <Stack.Group>
        <Stack.Screen name='EditProfile' component={EditProfileScreen} />
        <Stack.Screen name='SettingsScreen' component={SettingsScreen} />
        <Stack.Screen name='AboutScreen' component={AboutScreen} />
        <Stack.Screen
          name='ListeningHistoryScreen'
          component={ListeningHistoryScreen}
        />
        <Stack.Screen
          name='AccountSettingsScreen'
          component={AccountSettingsScreen}
        />
        <Stack.Screen
          name='InboxSettingsScreen'
          component={InboxSettingsScreen}
        />
        <Stack.Screen
          name='CommentSettingsScreen'
          component={CommentSettingsScreen}
        />
        <Stack.Screen
          name='DownloadSettingsScreen'
          component={DownloadSettingsScreen}
        />
        <Stack.Screen
          name='NotificationSettingsScreen'
          component={NotificationSettingsScreen}
        />
        <Stack.Screen
          name='AccountVerificationScreen'
          component={AccountVerificationScreen}
        />
        <Stack.Screen name='ChangeEmail' component={ChangeEmailModalScreen} />
      </Stack.Group>
      <Stack.Group>
        <Stack.Screen name='BuySellScreen' component={BuySellScreen} />
        <Stack.Screen name='ConfirmSwapScreen' component={ConfirmSwapScreen} />
        <Stack.Screen
          name='TransactionResultScreen'
          component={TransactionResultScreen}
        />
      </Stack.Group>
      <Stack.Screen
        name='FilterButton'
        component={FilterButtonScreen}
        options={{ ...screenOptions, presentation: 'fullScreenModal' }}
      />
      <Stack.Group>
        <Stack.Screen name='ChatList' component={ChatListScreen} />
        <Stack.Screen name='ChatUserList' component={ChatUserListScreen} />
        <Stack.Screen
          name='Chat'
          component={ChatScreen}
          getId={({ params }) =>
            // @ts-ignore hard to correctly type navigation params (PAY-1141)
            params?.chatId
          }
          options={{ ...screenOptions, fullScreenGestureEnabled: false }}
        />
      </Stack.Group>
    </Stack.Navigator>
  )
}
