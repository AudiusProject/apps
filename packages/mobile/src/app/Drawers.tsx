import React from 'react'
import type { ComponentType } from 'react'

import type { Modals } from '@audius/common/store'

import { AddCashDrawer } from 'app/components/add-funds-drawer/AddCashDrawer'
import { AddToCollectionDrawer } from 'app/components/add-to-collection-drawer'
import { ApiRewardsDrawer } from 'app/components/api-rewards-drawer/ApiRewardsDrawer'
import { ArtistCoinDetailsDrawer } from 'app/components/artist-coin-details-drawer/ArtistCoinDetailsDrawer'
import { AudioBreakdownDrawer } from 'app/components/audio-breakdown-drawer'
import { TiersExplainerDrawer } from 'app/components/audio-rewards'
import { BlockMessagesDrawer } from 'app/components/block-messages-drawer'
import { ChallengeRewardsDrawer } from 'app/components/challenge-rewards-drawer'
import { ClaimAllRewardsDrawer } from 'app/components/challenge-rewards-drawer/ClaimAllRewardsDrawer'
import { ChatActionsDrawer } from 'app/components/chat-actions-drawer'
import { CoinflowOnrampDrawer } from 'app/components/coinflow-onramp-drawer/CoinflowOnrampDrawer'
import { CoinflowWithdrawDrawer } from 'app/components/coinflow-withdraw-drawer/CoinflowWithdrawDrawer'
import { CreateChatActionsDrawer } from 'app/components/create-chat-actions-drawer'
import { DeactivateAccountConfirmationDrawer } from 'app/components/deactivate-account-confirmation-drawer'
import { DeleteChatDrawer } from 'app/components/delete-chat-drawer'
import { DeletePlaylistConfirmationDrawer } from 'app/components/delete-playlist-confirmation-drawer'
import { DownloadTrackArchiveDrawer } from 'app/components/download-track-archive-drawer/DownloadTrackArchiveDrawer'
import { ArtistPickConfirmationDrawer } from 'app/components/drawers/ArtistPickConfirmationDrawer'
import { MuteCommentsConfirmationDrawer } from 'app/components/drawers/MuteCommentsConfirmationDrawer'
import { DuplicateAddConfirmationDrawer } from 'app/components/duplicate-add-confirmation-drawer'
import { EnablePushNotificationsDrawer } from 'app/components/enable-push-notifications-drawer'
import { FeedFilterDrawer } from 'app/components/feed-filter-drawer'
import { ForgotPasswordDrawer } from 'app/components/forgot-password-drawer'
import { HostRemixContestDrawer } from 'app/components/host-remix-contest-drawer/HostRemixContestDrawer'
import { InboxUnavailableDrawer } from 'app/components/inbox-unavailable-drawer/InboxUnavailableDrawer'
import { LeavingAudiusDrawer } from 'app/components/leaving-audius-drawer'
import { LockedContentDrawer } from 'app/components/locked-content-drawer'
import { ManagerModeDrawer } from 'app/components/manager-mode-drawer/ManagerModeDrawer'
import { OverflowMenuDrawer } from 'app/components/overflow-menu-drawer'
import { PlaybackRateDrawer } from 'app/components/playback-rate-drawer'
import { PremiumContentPurchaseDrawer } from 'app/components/premium-content-purchase-drawer'
import { ProfileActionsDrawer } from 'app/components/profile-actions-drawer'
import { PurchaseVendorDrawer } from 'app/components/purchase-vendor-drawer/PurchaseVendorDrawer'
import { RateCtaDrawer } from 'app/components/rate-cta-drawer'
import { ReceiveTokensDrawer } from 'app/components/receive-tokens-drawer'
import { SendTokensDrawer } from 'app/components/send-tokens-drawer'
import { ShareDrawer } from 'app/components/share-drawer'
import { SignOutConfirmationDrawer } from 'app/components/sign-out-confirmation-drawer'
import { StripeOnrampDrawer } from 'app/components/stripe-onramp-drawer'
import { SupportersInfoDrawer } from 'app/components/supporters-info-drawer'
import { TransferAudioMobileDrawer } from 'app/components/transfer-audio-mobile-drawer'
import { TrendingRewardsDrawer } from 'app/components/trending-rewards-drawer'
import { WaitForDownloadDrawer } from 'app/components/wait-for-download-drawer'
import { WithdrawUSDCDrawer } from 'app/components/withdraw-usdc-drawer/WithdrawUSDCDrawer'
import { CoinInsightsOverflowMenu } from 'app/screens/coin-details-screen/components/CoinInsightsOverflowMenu'
import { ReplaceTrackProgressDrawer } from 'app/screens/edit-track-screen/components'
import { EarlyReleaseConfirmationDrawer } from 'app/screens/edit-track-screen/components/EarlyReleaseConfirmationDrawer'
import { PublishConfirmationDrawer } from 'app/screens/edit-track-screen/components/PublishConfirmationDrawer'
import { ConnectNewWalletDrawer } from 'app/screens/external-wallets/components/ConnectNewWalletDrawer'
import { WelcomeDrawer } from 'app/screens/sign-on-screen/components/WelcomeDrawer'
import { PickWinnersDrawer } from 'app/screens/track-screen/PickWinnersDrawer'
import { TrendingFilterDrawer } from 'app/screens/trending-screen'
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
  modal: ComponentType
  modalName: Modals
}

/*
 * Conditionally renders the drawers hooked up to @audius/web/src/common/ui/modal slice
 */
const CommonDrawer = (props: CommonDrawerProps) => {
  const { modal: Modal, modalName } = props
  const { modalState } = useDrawerState(modalName)

  if (!modalState) return null

  return <Modal />
}

type NativeDrawerProps = {
  drawer: ComponentType
  drawerName: Drawer
}

/*
 * Conditionally renders the drawers hooked up to native store/drawers slice
 */
export const NativeDrawer = (props: NativeDrawerProps) => {
  const { drawer: Drawer, drawerName } = props
  const { visibleState } = useDrawer(drawerName)

  if (!visibleState) return null

  return <Drawer />
}

const commonDrawersMap: { [Modal in Modals]?: ComponentType } = {
  TiersExplainer: TiersExplainerDrawer,
  TrendingRewardsExplainer: TrendingRewardsDrawer,
  ChallengeRewards: ChallengeRewardsDrawer,
  ClaimAllRewards: ClaimAllRewardsDrawer,
  APIRewardsExplainer: ApiRewardsDrawer,
  TransferAudioMobileWarning: TransferAudioMobileDrawer,
  Share: ShareDrawer,
  DeactivateAccountConfirmation: DeactivateAccountConfirmationDrawer,
  FeedFilter: FeedFilterDrawer,
  TrendingGenreSelection: TrendingFilterDrawer,
  Overflow: OverflowMenuDrawer,
  SignOutConfirmation: SignOutConfirmationDrawer,
  AddToCollection: AddToCollectionDrawer,
  AudioBreakdown: AudioBreakdownDrawer,
  DeletePlaylistConfirmation: DeletePlaylistConfirmationDrawer,
  DuplicateAddConfirmation: DuplicateAddConfirmationDrawer,
  ProfileActions: ProfileActionsDrawer,
  PlaybackRate: PlaybackRateDrawer,
  // PremiumContent, AddCash, PurchaseVendor, and StripOnRamp *must* be in this order
  // to avoid zIndex issues.
  PremiumContentPurchaseModal: PremiumContentPurchaseDrawer,
  AddCashModal: AddCashDrawer,
  PurchaseVendor: PurchaseVendorDrawer,
  StripeOnRamp: StripeOnrampDrawer,
  CoinflowOnramp: CoinflowOnrampDrawer,
  CoinflowWithdraw: CoinflowWithdrawDrawer,
  InboxUnavailableModal: InboxUnavailableDrawer,
  LeavingAudiusModal: LeavingAudiusDrawer,
  WaitForDownloadModal: WaitForDownloadDrawer,
  PublishConfirmation: PublishConfirmationDrawer,
  ReplaceTrackProgress: ReplaceTrackProgressDrawer,
  EarlyReleaseConfirmation: EarlyReleaseConfirmationDrawer,
  ArtistPick: ArtistPickConfirmationDrawer,
  DownloadTrackArchive: DownloadTrackArchiveDrawer,
  HostRemixContest: HostRemixContestDrawer,
  WithdrawUSDCModal: WithdrawUSDCDrawer,
  ReceiveTokensModal: ReceiveTokensDrawer,
  SendTokensModal: SendTokensDrawer,
  ArtistCoinDetailsModal: ArtistCoinDetailsDrawer
}

const nativeDrawersMap: { [DrawerName in Drawer]?: ComponentType } = {
  EnablePushNotifications: EnablePushNotificationsDrawer,
  OfflineListening: OfflineListeningDrawer,
  ForgotPassword: ForgotPasswordDrawer,
  DeleteTrackConfirmation: DeleteTrackConfirmationDrawer,
  ShareToStoryProgress: ShareToStoryProgressDrawer,
  ManagerMode: ManagerModeDrawer,
  RateCallToAction: RateCtaDrawer,
  RemoveAllDownloads: RemoveAllDownloadsDrawer,
  RemoveDownloadedCollection: RemoveDownloadedCollectionDrawer,
  RemoveDownloadedFavorites: RemoveDownloadedFavoritesDrawer,
  UnfavoriteDownloadedCollection: UnfavoriteDownloadedCollectionDrawer,
  LockedContent: LockedContentDrawer,
  ChatActions: ChatActionsDrawer,
  CreateChatActions: CreateChatActionsDrawer,
  BlockMessages: BlockMessagesDrawer,
  MuteComments: MuteCommentsConfirmationDrawer,
  DeleteChat: DeleteChatDrawer,
  SupportersInfo: SupportersInfoDrawer,
  Welcome: WelcomeDrawer,
  ConnectNewWallet: ConnectNewWalletDrawer,
  PickWinners: PickWinnersDrawer,
  CoinInsightsOverflowMenu,
  WalletRowOverflowMenu
}

const commonDrawers = Object.entries(commonDrawersMap) as [
  Modals,
  ComponentType
][]

const nativeDrawers = Object.entries(nativeDrawersMap) as [
  Drawer,
  ComponentType
][]

export const Drawers = () => {
  return (
    <>
      {commonDrawers.map(([modalName, Modal]) => {
        return (
          <CommonDrawer key={modalName} modal={Modal} modalName={modalName} />
        )
      })}
      {nativeDrawers.map(([drawerName, Drawer]) => (
        <NativeDrawer
          key={drawerName}
          drawerName={drawerName}
          drawer={Drawer}
        />
      ))}
    </>
  )
}
