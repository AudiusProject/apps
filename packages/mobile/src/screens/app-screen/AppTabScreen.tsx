import { useCallback, useContext, useEffect, useRef, useState } from 'react'

import type {
  FavoriteType,
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
import type {
  GetCoinsSortMethodEnum,
  GetCoinsSortDirectionEnum
} from '@audius/sdk'
import type { EventArg, NavigationState } from '@react-navigation/native'
import { useIsFocused } from '@react-navigation/native'
import type { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StyleSheet, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'

import { FilterButtonScreen } from '@audius/harmony-native'
import type { FilterButtonScreenParams } from '@audius/harmony-native'
import { useDrawer } from 'app/hooks/useDrawer'
import { setLastNavAction } from 'app/hooks/useNavigation'
import { AppDrawerContext } from 'app/screens/app-drawer-screen'
import { useOpenDrawerGesture } from 'app/screens/app-drawer-screen/useOpenDrawerGesture'
import { SetAppTabNavigationContext } from 'app/screens/app-screen/AppTabNavigationProvider'
import type { AppTabNavigation } from 'app/screens/app-screen/AppTabNavigationProvider'
import { AudioScreen } from 'app/screens/audio-screen'
import { CashScreen } from 'app/screens/cash-screen'
import { ChatListScreen } from 'app/screens/chat-screen/ChatListScreen'
import { ChatMembersScreen } from 'app/screens/chat-screen/ChatMembersScreen'
import { ChatScreen } from 'app/screens/chat-screen/ChatScreen'
import { ChatUserListScreen } from 'app/screens/chat-screen/ChatUserListScreen'
import {
  CoinDetailsScreen,
  EditCoinDetailsScreen
} from 'app/screens/coin-details-screen'
import { CoinRedeemScreen } from 'app/screens/coin-redeem-screen'
import { CollectionScreen } from 'app/screens/collection-screen/CollectionScreen'
import { EditProfileScreen } from 'app/screens/edit-profile-screen'
import { ProfileScreen } from 'app/screens/profile-screen'
import { RewardsScreen } from 'app/screens/rewards-screen'
import { SendTokensUserSelectionScreen } from 'app/screens/send-tokens-user-selection-screen/SendTokensUserSelectionScreen'
import {
  AboutScreen,
  AccountSettingsScreen,
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
  CoinLeaderboardScreen
} from 'app/screens/user-list-screen'
import { WalletScreen } from 'app/screens/wallet-screen'
import { WeeklyRotationScreen } from 'app/screens/weekly-rotation-screen'

import { ContestFollowersScreen, ContestScreen } from '../contest-screen'
import { ContestsScreen } from '../contests-screen'
import { FanClubSortScreen } from '../fan-club-sort-screen/FanClubSortScreen'
import { FanClubsExploreScreen } from '../fan-clubs-explore-screen/FanClubsExploreScreen'

import { GlassChromeProvider } from './GlassChromeContext'
import { TabBarAutoHideBridge } from './TabBarAutoHideContext'
import { useAppScreenOptions } from './useAppScreenOptions'

export type AppTabScreenParamList = {
  Track: {
    searchTrack?: SearchTrack
    canBeUnlisted?: boolean
    showComments?: boolean
    commentId?: string
  } & ({ handle: string; slug: string } | { trackId: ID })
  TrackRemixes: { trackId: ID } | { handle: string; slug: string }
  Contest: { trackId: ID } | { handle: string; slug: string }
  ContestFollowers: { eventId: ID }
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
  RelatedArtists: { userId: ID }
  CoinLeaderboard: { mint: string }
  NotificationUsers: {
    notification: any
    notificationType: NotificationType
    count: number
  }
  SettingsScreen: undefined
  AboutScreen: undefined
  ListeningHistoryScreen: undefined
  // No handle: the signed-in user's own mix. With one: a shared mix.
  WeeklyRotationScreen: { handle?: string } | undefined
  AccountSettingsScreen: undefined
  ChangeEmail: undefined
  ChangePassword: undefined
  VerificationWebView: undefined
  InboxSettingsScreen: undefined
  CommentSettingsScreen: undefined
  DownloadSettingsScreen: undefined
  NotificationSettingsScreen: undefined

  AudioScreen: undefined
  RewardsScreen: undefined
  Contests: undefined
  FanClubsExplore: undefined
  FanClubSort: {
    initialSortMethod?: GetCoinsSortMethodEnum
    initialSortDirection?: GetCoinsSortDirectionEnum
  }
  wallet: undefined
  CashScreen: undefined
  CoinDetailsScreen: { ticker: string }
  CoinRedeemScreen: { ticker: string; code?: string }
  EditCoinDetailsScreen: { ticker: string }
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
  SendTokensUserSelection:
    | {
        excludedUserIds?: number[]
        callbackId?: string
      }
    | undefined
  Chat: {
    chatId: string
    presetMessage?: string
  }
  ChatMembers: { chatId: string }
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
  const { drawerNavigation, setIsAtStackRoot, gesturesDisabled } =
    useContext(AppDrawerContext)
  const { isOpen: isNowPlayingDrawerOpen } = useDrawer('NowPlaying')
  const { setNavigation } = useContext(SetAppTabNavigationContext)
  const isFocused = useIsFocused()
  const isAtStackRootRef = useRef(true)
  const [isAtStackRoot, setIsAtStackRootLocal] = useState(true)

  const applyDrawerSwipe = useCallback(
    (isAtRoot: boolean) => {
      setIsAtStackRoot?.(isAtRoot)
      // NowPlayingDrawer calls setOptions({ swipeEnabled: false }) imperatively
      // on pan release, and that override outlives a re-render of
      // screenOptions, so we re-assert it imperatively here too.
      drawerNavigation?.setOptions({
        swipeEnabled: isAtRoot && !isNowPlayingDrawerOpen
      })
    },
    [drawerNavigation, isNowPlayingDrawerOpen, setIsAtStackRoot]
  )

  const handleChangeState = useCallback(
    (event: NavigationStateEvent) => {
      // Nested navigator state changes bubble up; only act on the outer stack.
      if (event?.data?.state?.type !== 'stack') return
      const isAtRoot = event.data.state.routes.length === 1
      isAtStackRootRef.current = isAtRoot
      setIsAtStackRootLocal(isAtRoot)
      if (isFocused) applyDrawerSwipe(isAtRoot)
    },
    [isFocused, applyDrawerSwipe]
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

  // Re-apply on tab focus so the drawer reflects the active tab's stack depth.
  useEffect(() => {
    if (isFocused) applyDrawerSwipe(isAtStackRootRef.current)
  }, [isFocused, applyDrawerSwipe])

  // Keep AppTabNavigationContext pointed at the active tab's stack so external
  // surfaces like NowPlayingDrawer push onto whichever tab is currently in
  // focus, regardless of stack depth.
  const screenListeners = useCallback(
    ({ navigation }: { navigation: any }) => ({
      state: handleChangeState,
      transitionEnd: handleTransitionEnd,
      focus: () => setNavigation(navigation as AppTabNavigation)
    }),
    [handleChangeState, handleTransitionEnd, setNavigation]
  )

  // Mid-screen swipe-to-open on the tab's root screen. Off when a screen handles
  // horizontal gestures itself (gesturesDisabled, e.g. Feed) or when a right
  // swipe means back.
  const openDrawerGesture = useOpenDrawerGesture(
    isFocused && isAtStackRoot && !gesturesDisabled && !isNowPlayingDrawerOpen
  )

  return (
    // Publishes the floating header heights and scroll signal to this tab's
    // screens.
    <GlassChromeProvider>
      {/* Hands the scroll signal to the tab bar, which renders outside this provider. */}
      <TabBarAutoHideBridge isAtStackRoot={isAtStackRoot} />
      <GestureDetector gesture={openDrawerGesture}>
        <View style={styles.root} collapsable={false}>
          <Stack.Navigator
            screenOptions={screenOptions}
            screenListeners={screenListeners}
          >
            {baseScreen(Stack)}
            <Stack.Screen name='Track' getComponent={() => TrackScreen} />
            <Stack.Screen
              name='TrackRemixes'
              getComponent={() => TrackRemixesScreen}
            />
            <Stack.Screen
              name='Collection'
              getComponent={() => CollectionScreen}
            />
            <Stack.Screen
              name='Profile'
              getComponent={() => ProfileScreen}
              // Profile uses a collapsible tab view (horizontal pager + vertical
              // scroll). The global `fullScreenGestureEnabled: true` makes the
              // swipe-to-pop recognizer span the whole screen, so a slightly diagonal
              // vertical scroll gets hijacked as a back gesture. Restrict swipe-back
              // to the left edge here (same treatment as the Chat screen) so
              // mid-screen scrolling reaches the list untouched.
              options={{ headerShown: false, fullScreenGestureEnabled: false }}
            />
            <Stack.Group>
              <Stack.Screen
                name='Followers'
                getComponent={() => FollowersScreen}
              />
              <Stack.Screen
                name='Following'
                getComponent={() => FollowingScreen}
              />
              <Stack.Screen
                name='Favorited'
                getComponent={() => FavoritedScreen}
              />
              <Stack.Screen name='Mutuals' getComponent={() => MutualsScreen} />
              <Stack.Screen
                name='RelatedArtists'
                getComponent={() => RelatedArtistsScreen}
              />
              <Stack.Screen
                name='NotificationUsers'
                getComponent={() => NotificationUsersScreen}
              />
            </Stack.Group>
            <Stack.Screen name='Reposts' getComponent={() => RepostsScreen} />
            <Stack.Screen
              name='CoinLeaderboard'
              getComponent={() => CoinLeaderboardScreen}
            />

            <Stack.Screen name='AudioScreen' getComponent={() => AudioScreen} />
            <Stack.Screen
              name='RewardsScreen'
              getComponent={() => RewardsScreen}
            />
            <Stack.Screen
              name='Contests'
              getComponent={() => ContestsScreen}
              // Contests is reached from the left nav drawer, which passes
              // `fromAppDrawer: true` and drops the screen animation to 'none'.
              // That leaves a jarring instant pop when navigating away. Force the
              // standard horizontal push so it transitions like the Track screen.
              options={{ animation: 'simple_push' }}
            />
            <Stack.Screen name='Contest' getComponent={() => ContestScreen} />
            <Stack.Screen
              name='ContestFollowers'
              getComponent={() => ContestFollowersScreen}
            />
            <Stack.Screen name='wallet' getComponent={() => WalletScreen} />
            <Stack.Screen name='CashScreen' getComponent={() => CashScreen} />
            <Stack.Screen
              name='CoinDetailsScreen'
              getComponent={() => CoinDetailsScreen}
            />
            <Stack.Screen
              name='CoinRedeemScreen'
              getComponent={() => CoinRedeemScreen}
            />
            <Stack.Screen
              name='EditCoinDetailsScreen'
              getComponent={() => EditCoinDetailsScreen}
            />
            <Stack.Screen
              name='FanClubsExplore'
              getComponent={() => FanClubsExploreScreen}
            />
            <Stack.Screen
              name='WeeklyRotationScreen'
              getComponent={() => WeeklyRotationScreen}
            />
            <Stack.Screen
              name='FanClubSort'
              getComponent={() => FanClubSortScreen}
            />

            <Stack.Group>
              <Stack.Screen
                name='EditProfile'
                getComponent={() => EditProfileScreen}
              />
              <Stack.Screen
                name='SettingsScreen'
                getComponent={() => SettingsScreen}
              />
              <Stack.Screen
                name='AboutScreen'
                getComponent={() => AboutScreen}
              />
              <Stack.Screen
                name='ListeningHistoryScreen'
                getComponent={() => ListeningHistoryScreen}
              />
              <Stack.Screen
                name='AccountSettingsScreen'
                getComponent={() => AccountSettingsScreen}
              />
              <Stack.Screen
                name='InboxSettingsScreen'
                getComponent={() => InboxSettingsScreen}
              />
              <Stack.Screen
                name='CommentSettingsScreen'
                getComponent={() => CommentSettingsScreen}
              />
              <Stack.Screen
                name='DownloadSettingsScreen'
                getComponent={() => DownloadSettingsScreen}
              />
              <Stack.Screen
                name='NotificationSettingsScreen'
                getComponent={() => NotificationSettingsScreen}
              />
            </Stack.Group>

            <Stack.Screen
              name='FilterButton'
              getComponent={() => FilterButtonScreen}
              options={{ ...screenOptions, presentation: 'fullScreenModal' }}
            />
            <Stack.Group>
              <Stack.Screen
                name='ChatList'
                getComponent={() => ChatListScreen}
              />
              <Stack.Screen
                name='ChatUserList'
                getComponent={() => ChatUserListScreen}
              />
              <Stack.Screen
                name='SendTokensUserSelection'
                getComponent={() => SendTokensUserSelectionScreen}
              />
              <Stack.Screen
                name='Chat'
                getComponent={() => ChatScreen}
                getId={({ params }) =>
                  // @ts-ignore hard to correctly type navigation params (PAY-1141)
                  params?.chatId
                }
                options={{ ...screenOptions, fullScreenGestureEnabled: false }}
              />
              <Stack.Screen
                name='ChatMembers'
                getComponent={() => ChatMembersScreen}
              />
            </Stack.Group>
          </Stack.Navigator>
        </View>
      </GestureDetector>
    </GlassChromeProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 }
})
