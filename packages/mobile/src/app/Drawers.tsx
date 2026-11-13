import React from 'react'
import type { ComponentType } from 'react'

import type { Modals } from '@audius/common/store'

import { AddCashDrawer } from 'app/components/add-funds-drawer/AddCashDrawer'
import { AddToCollectionDrawer } from 'app/components/add-to-collection-drawer'
import { AudioBreakdownDrawer } from 'app/components/audio-breakdown-drawer'
import { TiersExplainerDrawer } from 'app/components/audio-rewards'
import { BlockMessagesDrawer } from 'app/components/block-messages-drawer'
import { ChatActionsDrawer } from 'app/components/chat-actions-drawer'
import { CoinflowOnrampDrawer } from 'app/components/coinflow-onramp-drawer/CoinflowOnrampDrawer'
import { CoinflowWithdrawDrawer } from 'app/components/coinflow-withdraw-drawer/CoinflowWithdrawDrawer'
import { ConnectDrawer } from 'app/components/connect-drawer'
import { CreateChatActionsDrawer } from 'app/components/create-chat-actions-drawer'
import { DeactivateAccountConfirmationDrawer } from 'app/components/deactivate-account-confirmation-drawer'
import { DeleteChatDrawer } from 'app/components/delete-chat-drawer'
import { DeletePlaylistConfirmationDrawer } from 'app/components/delete-playlist-confirmation-drawer'
import { DownloadTrackArchiveDrawer } from 'app/components/download-track-archive-drawer/DownloadTrackArchiveDrawer'
import { ArtistPickConfirmationDrawer } from 'app/components/drawers/ArtistPickConfirmationDrawer'
import { MuteCommentsConfirmationDrawer } from 'app/components/drawers/MuteCommentsConfirmationDrawer'
import { DuplicateAddConfirmationDrawer } from 'app/components/duplicate-add-confirmation-drawer'
import { EnablePushNotificationsDrawer } from 'app/components/enable-push-notifications-drawer'
import { FanClubDetailsDrawer } from 'app/components/fan-club-details-drawer/FanClubDetailsDrawer'
import { ForgotPasswordDrawer } from 'app/components/forgot-password-drawer'
import { HostRemixContestDrawer } from 'app/components/host-remix-contest-drawer/HostRemixContestDrawer'
import { InboxUnavailableDrawer } from 'app/components/inbox-unavailable-drawer/InboxUnavailableDrawer'
import { LeaveChatDrawer } from 'app/components/leave-chat-drawer'
import { LeavingAudiusDrawer } from 'app/components/leaving-audius-drawer'
import { LockedContentDrawer } from 'app/components/locked-content-drawer'
import { LockedTextPostDrawer } from 'app/components/locked-text-post-drawer'
import { AccountSwitcherDrawer } from 'app/components/manager-mode/AccountSwitcherDrawer'
import { ManagerModeDrawer } from 'app/components/manager-mode-drawer/ManagerModeDrawer'
import { OverflowMenuDrawer } from 'app/components/overflow-menu-drawer'
import { PlaybackRateDrawer } from 'app/components/playback-rate-drawer'
import { PremiumContentPurchaseDrawer } from 'app/components/premium-content-purchase-drawer'
import { ProfileActionsDrawer } from 'app/components/profile-actions-drawer'
import { PurchaseVendorDrawer } from 'app/components/purchase-vendor-drawer/PurchaseVendorDrawer'
import { QueueDrawer } from 'app/components/queue-drawer'
import { RateCtaDrawer } from 'app/components/rate-cta-drawer'
import { ReceiveTokensDrawer } from 'app/components/receive-tokens-drawer'
import { SendTokensDrawer } from 'app/components/send-tokens-drawer'
import { SignOutConfirmationDrawer } from 'app/components/sign-out-confirmation-drawer'
import { StripeOnrampDrawer } from 'app/components/stripe-onramp-drawer'
import { TransferAudioMobileDrawer } from 'app/components/transfer-audio-mobile-drawer'
import { VerificationErrorDrawer } from 'app/components/verification-error-drawer/VerificationErrorDrawer'
import { VerificationSuccessDrawer } from 'app/components/verification-success-drawer/VerificationSuccessDrawer'
import { WaitForDownloadDrawer } from 'app/components/wait-for-download-drawer'
import { WithdrawUSDCDrawer } from 'app/components/withdraw-usdc-drawer/WithdrawUSDCDrawer'
import { CoinInsightsOverflowMenu } from 'app/screens/coin-details-screen/components/CoinInsightsOverflowMenu'
import { ReplaceTrackProgressDrawer } from 'app/screens/edit-track-screen/components'
import { EarlyReleaseConfirmationDrawer } from 'app/screens/edit-track-screen/components/EarlyReleaseConfirmationDrawer'
import { PublishConfirmationDrawer } from 'app/screens/edit-track-screen/components/PublishConfirmationDrawer'
import { ConnectNewWalletDrawer } from 'app/screens/external-wallets/components/ConnectNewWalletDrawer'
import { FeedFilterDrawer } from 'app/screens/feed-screen/FeedFilterDrawer'
import { WelcomeDrawer } from 'app/screens/sign-on-screen/components/WelcomeDrawer'
import { PickWinnersDrawer } from 'app/screens/track-screen/PickWinnersDrawer'
import { TrendingCombinedFilterDrawer } from 'app/screens/trending-screen/TrendingCombinedFilterDrawer'
import { TrendingFilterDrawer } from 'app/screens/trending-screen/TrendingFilterDrawer'
import { WalletRowOverflowMenu } from 'app/screens/wallet-screen/components/LinkedWallets'

import { useDrawerState } from '../components/drawer'
import {
  DeleteTrackConfirmationDrawer,
  OfflineListeningDrawer,
  RemoveAllDownloadsDrawer,
  RemoveDownloadedCollectionDrawer,
  RemoveDownloadedFavoritesDrawer,
  UnfavoriteDownloadedCollectionDrawer
} from '../components/drawers'
import { ShareToStoryProgressDrawer } from '../components/share-drawer/useShareToStory'
import { useDrawer } from '../hooks/useDrawer'
import type { Drawer } from '../store/drawers/slice'
type CommonDrawerProps = {
  getModal: LazyComponent
  modalName: Modals
}

/*
 * Conditionally renders the drawers hooked up to @audius/web/src/common/ui/modal slice
 */
const CommonDrawer = (props: CommonDrawerProps) => {
  const { getModal, modalName } = props
  const { modalState } = useDrawerState(modalName)

  if (!modalState) return null

  const Modal = getModal()
  return <Modal />
}

type NativeDrawerProps = {
  getDrawer: LazyComponent
  drawerName: Drawer
}

/*
 * Conditionally renders the drawers hooked up to native store/drawers slice
 */
export const NativeDrawer = (props: NativeDrawerProps) => {
  const { getDrawer, drawerName } = props
  const { visibleState } = useDrawer(drawerName)

  if (!visibleState) return null

  const Drawer = getDrawer()
  return <Drawer />
}

// Each value is a thunk so the drawer module is only required the first time
// it opens. With Metro inline requires, referencing the import inside the
// arrow defers the require; a plain value would load every drawer at startup.
type LazyComponent = () => ComponentType

const commonDrawersMap: { [Modal in Modals]?: LazyComponent } = {
  TiersExplainer: () => TiersExplainerDrawer,
  TransferAudioMobileWarning: () => TransferAudioMobileDrawer,
  DeactivateAccountConfirmation: () => DeactivateAccountConfirmationDrawer,
  TrendingGenreSelection: () => TrendingFilterDrawer,
  TrendingFilter: () => TrendingCombinedFilterDrawer,
  FeedFilter: () => FeedFilterDrawer,
  Overflow: () => OverflowMenuDrawer,
  SignOutConfirmation: () => SignOutConfirmationDrawer,
  AddToCollection: () => AddToCollectionDrawer,
  AudioBreakdown: () => AudioBreakdownDrawer,
  DeletePlaylistConfirmation: () => DeletePlaylistConfirmationDrawer,
  DuplicateAddConfirmation: () => DuplicateAddConfirmationDrawer,
  ProfileActions: () => ProfileActionsDrawer,
  PlaybackRate: () => PlaybackRateDrawer,
  // PremiumContent, AddCash, PurchaseVendor, and StripOnRamp *must* be in this order
  // to avoid zIndex issues.
  PremiumContentPurchaseModal: () => PremiumContentPurchaseDrawer,
  AddCashModal: () => AddCashDrawer,
  PurchaseVendor: () => PurchaseVendorDrawer,
  StripeOnRamp: () => StripeOnrampDrawer,
  CoinflowOnramp: () => CoinflowOnrampDrawer,
  CoinflowWithdraw: () => CoinflowWithdrawDrawer,
  InboxUnavailableModal: () => InboxUnavailableDrawer,
  LeavingAudiusModal: () => LeavingAudiusDrawer,
  WaitForDownloadModal: () => WaitForDownloadDrawer,
  PublishConfirmation: () => PublishConfirmationDrawer,
  ReplaceTrackProgress: () => ReplaceTrackProgressDrawer,
  EarlyReleaseConfirmation: () => EarlyReleaseConfirmationDrawer,
  ArtistPick: () => ArtistPickConfirmationDrawer,
  DownloadTrackArchive: () => DownloadTrackArchiveDrawer,
  HostRemixContest: () => HostRemixContestDrawer,
  WithdrawUSDCModal: () => WithdrawUSDCDrawer,
  ReceiveTokensModal: () => ReceiveTokensDrawer,
  SendTokensModal: () => SendTokensDrawer,
  FanClubDetailsModal: () => FanClubDetailsDrawer,
  VerificationSuccess: () => VerificationSuccessDrawer,
  VerificationError: () => VerificationErrorDrawer
}

const nativeDrawersMap: { [DrawerName in Drawer]?: LazyComponent } = {
  EnablePushNotifications: () => EnablePushNotificationsDrawer,
  OfflineListening: () => OfflineListeningDrawer,
  ForgotPassword: () => ForgotPasswordDrawer,
  DeleteTrackConfirmation: () => DeleteTrackConfirmationDrawer,
  ShareToStoryProgress: () => ShareToStoryProgressDrawer,
  ManagerMode: () => ManagerModeDrawer,
  AccountSwitcher: () => AccountSwitcherDrawer,
  RateCallToAction: () => RateCtaDrawer,
  RemoveAllDownloads: () => RemoveAllDownloadsDrawer,
  RemoveDownloadedCollection: () => RemoveDownloadedCollectionDrawer,
  RemoveDownloadedFavorites: () => RemoveDownloadedFavoritesDrawer,
  UnfavoriteDownloadedCollection: () => UnfavoriteDownloadedCollectionDrawer,
  LockedContent: () => LockedContentDrawer,
  LockedTextPost: () => LockedTextPostDrawer,
  ChatActions: () => ChatActionsDrawer,
  CreateChatActions: () => CreateChatActionsDrawer,
  BlockMessages: () => BlockMessagesDrawer,
  MuteComments: () => MuteCommentsConfirmationDrawer,
  DeleteChat: () => DeleteChatDrawer,
  LeaveChat: () => LeaveChatDrawer,
  Welcome: () => WelcomeDrawer,
  ConnectNewWallet: () => ConnectNewWalletDrawer,
  PickWinners: () => PickWinnersDrawer,
  Queue: () => QueueDrawer,
  Connect: () => ConnectDrawer,
  CoinInsightsOverflowMenu: () => CoinInsightsOverflowMenu,
  WalletRowOverflowMenu: () => WalletRowOverflowMenu
}

const commonDrawers = Object.entries(commonDrawersMap) as [
  Modals,
  LazyComponent
][]

const nativeDrawers = Object.entries(nativeDrawersMap) as [
  Drawer,
  LazyComponent
][]

export const Drawers = () => {
  return (
    <>
      {commonDrawers.map(([modalName, getModal]) => (
        <CommonDrawer
          key={modalName}
          getModal={getModal}
          modalName={modalName}
        />
      ))}
      {nativeDrawers.map(([drawerName, getDrawer]) => (
        <NativeDrawer
          key={drawerName}
          drawerName={drawerName}
          getDrawer={getDrawer}
        />
      ))}
    </>
  )
}
