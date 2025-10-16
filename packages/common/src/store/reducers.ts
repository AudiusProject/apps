import { History } from 'history'
import { combineReducers } from 'redux'
import type { Storage } from 'redux-persist'

import account from './account/slice'
import averageColorReducer from './average-color/slice'
import { buyUSDCReducer } from './buy-usdc'
import cast from './cast/slice'
import changePasswordReducer from './change-password/slice'
import { ChangePasswordState } from './change-password/types'
import confirmer from './confirmer/reducer'
import { ConfirmerState } from './confirmer/types'
import downloads, { DownloadState } from './downloads/slice'
import gatedContent from './gated-content/slice'
import musicConfettiReducer, {
  MusicConfettiState
} from './music-confetti/slice'
import { HistoryPageState, LibraryPageState } from './pages'
import ai from './pages/ai/slice'
import audioRewardsSlice from './pages/audio-rewards/slice'
import { chatReducer } from './pages/chat'
import collection from './pages/collection/reducer'
import { CollectionsPageState } from './pages/collection/types'
import {
  deactivateAccountReducer,
  DeactivateAccountState
} from './pages/deactivate-account'
import feed from './pages/feed/reducer'
import { FeedPageState } from './pages/feed/types'
import historyPageReducer from './pages/history-page/reducer'
import { persistedLibraryPageReducer } from './pages/library-page/reducer'
import pickWinners from './pages/pick-winners/slice'
import premiumTracks from './pages/premium-tracks/slice'
import profileReducer from './pages/profile/reducer'
import { ProfilePageState } from './pages/profile/types'
import remixes from './pages/remixes/slice'
import searchResults from './pages/search-results/reducer'
import { SearchPageState } from './pages/search-results/types'
import settings from './pages/settings/reducer'
import { SettingsPageState } from './pages/settings/types'
import tokenDashboardSlice from './pages/token-dashboard/slice'
import track from './pages/track/reducer'
import { TrackPageState } from './pages/track/types'
import trending from './pages/trending/reducer'
import { TrendingPageState } from './pages/trending/types'
import trendingPlaylists from './pages/trending-playlists/slice'
import trendingUnderground from './pages/trending-underground/slice'
import { PlaybackPositionState } from './playback-position'
import playbackPosition from './playback-position/slice'
import player, { PlayerState } from './player/slice'
import {
  playlistLibraryReducer,
  PlaylistLibraryState
} from './playlist-library'
import { playlistUpdatesReducer, PlaylistUpdateState } from './playlist-updates'
import { purchaseContentReducer } from './purchase-content'
import queue from './queue/slice'
import reachability from './reachability/reducer'
import { ReachabilityState } from './reachability/types'
import { recoveryEmailReducer, RecoveryEmailState } from './recovery-email'
import savedCollectionsReducer from './saved-collections/slice'
import searchReducer from './search/slice'
import { SearchState } from './search/types'
import stemsUpload from './stems-upload/slice'
import tippingReducer from './tipping/slice'
import {
  searchUsersModalReducer,
  SearchUsersModalState,
  ToastState,
  TransactionDetailsState,
  withdrawUSDCReducer
} from './ui'
import addToCollectionReducer, {
  AddToCollectionState
} from './ui/add-to-collection/reducer'
import buyAudioReducer from './ui/buy-audio/slice'
import coinflowModalReducer from './ui/coinflow-modal/slice'
import deletePlaylistConfirmationReducer from './ui/delete-playlist-confirmation-modal/slice'
import { DeletePlaylistConfirmationModalState } from './ui/delete-playlist-confirmation-modal/types'
import duplicateAddConfirmationReducer from './ui/duplicate-add-confirmation-modal/slice'
import { DuplicateAddConfirmationModalState } from './ui/duplicate-add-confirmation-modal/types'
import mobileOverflowModalReducer from './ui/mobile-overflow-menu/slice'
import { MobileOverflowModalState } from './ui/mobile-overflow-menu/types'
import { modalsReducer, ModalsState } from './ui/modals'
import nowPlayingReducer, { NowPlayingState } from './ui/now-playing/slice'
import shareModalReducer from './ui/share-modal/slice'
import { ShareModalState } from './ui/share-modal/types'
import stripeModalReducer from './ui/stripe-modal/slice'
import { StripeModalState } from './ui/stripe-modal/types'
import theme, { ThemeState } from './ui/theme/slice'
import toastReducer from './ui/toast/slice'
import transactionDetailsReducer from './ui/transaction-details/slice'
import { UploadConfirmationModalState } from './ui/upload-confirmation-modal/types'
import upload from './upload/reducer'
import { UploadState } from './upload/types'
import coinLeaderboardUserListReducer from './user-list/coin-leaderboard/reducers'
import favoritesUserListReducer from './user-list/favorites/reducers'
import followersUserListReducer from './user-list/followers/reducers'
import followingUserListReducer from './user-list/following/reducers'
import mutualsUserListReducer from './user-list/mutuals/reducers'
import notificationsUserListReducer from './user-list/notifications/reducers'
import purchasersUserListReducer from './user-list/purchasers/reducers'
import relatedArtistsListReducer from './user-list/related-artists/reducers'
import remixersUserListReducer from './user-list/remixers/reducers'
import repostsUserListReducer from './user-list/reposts/reducers'
import supportingUserListReducer from './user-list/supporting/reducers'
import topSupportersUserListReducer from './user-list/top-supporters/reducers'
import wallet from './wallet/slice'

/**
 * A function that creates common reducers.
 * @returns an object of all reducers to be used with `combineReducers`
 */
export const reducers = (storage: Storage, history?: History) => ({
  account,

  // TODO: Move to common
  // signOn: signOnReducer,
  // backend,
  // confirmer,

  // Config
  reachability,

  savedCollections: savedCollectionsReducer,

  // Playback
  queue,
  player,
  playbackPosition,

  // Wallet
  wallet,

  // Cast
  cast,

  // Playlist Library
  playlistLibrary: playlistLibraryReducer,
  playlistUpdates: playlistUpdatesReducer,

  // UI
  ui: combineReducers({
    averageColor: averageColorReducer,
    addToCollection: addToCollectionReducer,
    buyAudio: buyAudioReducer,

    changePassword: changePasswordReducer,
    deletePlaylistConfirmationModal: deletePlaylistConfirmationReducer,
    duplicateAddConfirmationModal: duplicateAddConfirmationReducer,
    mobileOverflowModal: mobileOverflowModalReducer,
    modals: modalsReducer,
    musicConfetti: musicConfettiReducer,
    nowPlaying: nowPlayingReducer,
    shareModal: shareModalReducer,
    stripeModal: stripeModalReducer,
    coinflowModal: coinflowModalReducer,
    searchUsersModal: searchUsersModalReducer,
    toast: toastReducer,
    transactionDetails: transactionDetailsReducer,
    userList: combineReducers({
      coinLeaderboard: coinLeaderboardUserListReducer,
      followers: followersUserListReducer,
      following: followingUserListReducer,
      reposts: repostsUserListReducer,
      favorites: favoritesUserListReducer,
      topSupporters: topSupportersUserListReducer,
      supporting: supportingUserListReducer,
      mutuals: mutualsUserListReducer,
      notifications: notificationsUserListReducer,
      relatedArtists: relatedArtistsListReducer,
      purchasers: purchasersUserListReducer,
      remixers: remixersUserListReducer
    }),
    theme,
    recoveryEmail: recoveryEmailReducer
  }),

  // Pages
  pages: combineReducers({
    ai,
    audioRewards: audioRewardsSlice.reducer,
    chat: chatReducer,
    collection,
    deactivateAccount: deactivateAccountReducer,
    feed,
    historyPage: historyPageReducer,
    pickWinners,
    profile: profileReducer,

    libraryPage: persistedLibraryPageReducer(storage),
    searchResults,
    tokenDashboard: tokenDashboardSlice.reducer,
    track,
    trending: trending(history),
    trendingPlaylists,
    trendingUnderground,
    settings,
    remixes,
    premiumTracks
  }),
  search: searchReducer(storage),
  stemsUpload,

  // Tipping
  tipping: tippingReducer,

  // Gated content
  buyUSDC: buyUSDCReducer,
  gatedContent,
  purchaseContent: purchaseContentReducer,
  withdrawUSDC: withdrawUSDCReducer,

  upload,
  confirmer,
  downloads
})

export type CommonState = {
  account: ReturnType<typeof account>
  // TODO: Migrate to common
  // signOn: ReturnType<typeof signOnReducer>

  // TODO: Migrate to common
  // backend: BackendState

  // Config
  reachability: ReachabilityState

  // TODO: Migrate to common
  // confirmer: ConfirmerState

  // TODO: missing types for internally managed api slice state
  api: any
  savedCollections: ReturnType<typeof savedCollectionsReducer>

  // Playback
  queue: ReturnType<typeof queue>
  player: PlayerState
  playbackPosition: PlaybackPositionState

  // Wallet
  wallet: ReturnType<typeof wallet>

  // Cast
  cast: ReturnType<typeof cast>

  // Playlist library
  playlistLibrary: PlaylistLibraryState
  playlistUpdates: PlaylistUpdateState

  ui: {
    averageColor: ReturnType<typeof averageColorReducer>
    buyAudio: ReturnType<typeof buyAudioReducer>
    addToCollection: AddToCollectionState
    changePassword: ChangePasswordState
    deletePlaylistConfirmationModal: DeletePlaylistConfirmationModalState
    duplicateAddConfirmationModal: DuplicateAddConfirmationModalState
    mobileOverflowModal: MobileOverflowModalState
    modals: ModalsState
    musicConfetti: MusicConfettiState
    nowPlaying: NowPlayingState
    searchUsersModal: SearchUsersModalState
    shareModal: ShareModalState
    stripeModal: StripeModalState
    toast: ToastState
    transactionDetails: TransactionDetailsState
    uploadConfirmationModal: UploadConfirmationModalState
    userList: {
      coinLeaderboard: ReturnType<typeof coinLeaderboardUserListReducer>
      mutuals: ReturnType<typeof mutualsUserListReducer>
      notifications: ReturnType<typeof notificationsUserListReducer>
      followers: ReturnType<typeof followersUserListReducer>
      following: ReturnType<typeof followingUserListReducer>
      reposts: ReturnType<typeof repostsUserListReducer>
      favorites: ReturnType<typeof favoritesUserListReducer>
      topSupporters: ReturnType<typeof topSupportersUserListReducer>
      supporting: ReturnType<typeof supportingUserListReducer>
      relatedArtists: ReturnType<typeof relatedArtistsListReducer>
      purchasers: ReturnType<typeof purchasersUserListReducer>
      remixers: ReturnType<typeof remixersUserListReducer>
    }
    theme: ThemeState
    recoveryEmail: RecoveryEmailState
  }

  pages: {
    ai: ReturnType<typeof ai>
    audioRewards: ReturnType<typeof audioRewardsSlice.reducer>
    chat: ReturnType<typeof chatReducer>
    collection: CollectionsPageState
    deactivateAccount: DeactivateAccountState
    feed: FeedPageState

    tokenDashboard: ReturnType<typeof tokenDashboardSlice.reducer>
    historyPage: HistoryPageState
    track: TrackPageState
    pickWinners: ReturnType<typeof pickWinners>
    profile: ProfilePageState
    libraryPage: LibraryPageState
    searchResults: SearchPageState
    settings: SettingsPageState
    trending: TrendingPageState
    trendingPlaylists: ReturnType<typeof trendingPlaylists>
    trendingUnderground: ReturnType<typeof trendingUnderground>
    remixes: ReturnType<typeof remixes>
    premiumTracks: ReturnType<typeof premiumTracks>
  }
  search: SearchState

  stemsUpload: ReturnType<typeof stemsUpload>

  // USDC
  buyUSDC: ReturnType<typeof buyUSDCReducer>

  // Tipping
  tipping: ReturnType<typeof tippingReducer>

  // Gated content
  purchaseContent: ReturnType<typeof purchaseContentReducer>
  gatedContent: ReturnType<typeof gatedContent>
  withdrawUSDC: ReturnType<typeof withdrawUSDCReducer>

  upload: UploadState
  confirmer: ConfirmerState
  downloads: DownloadState
}
