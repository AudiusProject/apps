import { Action } from '@reduxjs/toolkit'

import { ModalSource } from '~/models/Analytics'

import { AddFundsModalState } from './add-funds-modal'
import { AlbumTrackRemoveConfirmationModalState } from './album-track-remove-confirmation-modal'
import { ArtistPickModalState } from './artist-pick-modal'
import { CoinflowOnrampModalState } from './coinflow-onramp-modal'
import { CoinflowWithdrawModalState } from './coinflow-withdraw-modal'
import { EditPlaylistModalState } from './edit-playlist-modal'
import { EditTrackModalState } from './edit-track-modal'
import { InboxUnavailableModalState } from './inbox-unavailable-modal'
import { LeavingAudiusModalState } from './leaving-audius-modal'
import { PremiumContentPurchaseModalState } from './premium-content-purchase-modal'
import { USDCManualTransferModalState } from './usdc-manual-transfer-modal'
import { USDCPurchaseDetailsModalState } from './usdc-purchase-details-modal'
import { USDCTransactionDetailsModalState } from './usdc-transaction-details-modal'
import { WaitForDownloadModalState } from './wait-for-download-modal'
import { WithdrawUSDCModalState } from './withdraw-usdc-modal'

export type BaseModalState = {
  isOpen: boolean | 'closing'
}

export type CreateChatModalState = {
  defaultUserList?: 'followers' | 'chats'
  presetMessage?: string
  onCancelAction?: Action
}

export type Modals =
  | 'TiersExplainer'
  | 'TrendingRewardsExplainer'
  | 'ChallengeRewardsExplainer'
  | 'ClaimAllRewards'
  | 'LinkSocialRewardsExplainer'
  | 'APIRewardsExplainer'
  | 'TransferAudioMobileWarning'
  | 'MobileConnectWalletsDrawer'
  | 'MobileEditCollectiblesDrawer'
  | 'Share'
  | 'HCaptcha'
  | 'BrowserPushPermissionConfirmation'
  | 'AudioBreakdown'
  | 'CollectibleDetails'
  | 'DeactivateAccountConfirmation'
  | 'FeedFilter'
  | 'PurchaseVendor'
  | 'TrendingGenreSelection'
  | 'SocialProof'
  | 'EditFolder'
  | 'EditPlaylist'
  | 'EditTrack'
  | 'SignOutConfirmation'
  | 'Overflow'
  | 'AddToCollection'
  | 'DeletePlaylistConfirmation'
  | 'FeatureFlagOverride'
  | 'BuyAudio'
  | 'BuyAudioRecovery'
  | 'TransactionDetails'
  | 'VipDiscord'
  | 'StripeOnRamp'
  | 'CoinflowOnramp'
  | 'InboxSettings'
  | 'PrivateKeyExporter'
  | 'LockedContent'
  | 'PlaybackRate'
  | 'ProfileActions'
  | 'PublishContentModal'
  | 'AiAttributionSettings'
  | 'DuplicateAddConfirmation'
  | 'PremiumContentPurchaseModal'
  | 'CreateChatModal'
  | 'InboxUnavailableModal'
  | 'LeavingAudiusModal'
  | 'UploadConfirmation'
  | 'PublishTrackConfirmation'
  | 'WithdrawUSDCModal'
  | 'USDCPurchaseDetailsModal'
  | 'USDCTransactionDetailsModal'
  | 'USDCManualTransferModal'
  | 'AddFundsModal'
  | 'Welcome'
  | 'CoinflowWithdraw'
  | 'WaitForDownloadModal'
  | 'ArtistPick'
  | 'AlbumTrackRemoveConfirmation'
  | 'PayoutWallet'

export type BasicModalsState = {
  [modal in Modals]: BaseModalState
}

export type StatefulModalsState = {
  CoinflowOnramp: CoinflowOnrampModalState
  CreateChatModal: CreateChatModalState
  EditPlaylist: EditPlaylistModalState
  EditTrack: EditTrackModalState
  InboxUnavailableModal: InboxUnavailableModalState
  LeavingAudiusModal: LeavingAudiusModalState
  WithdrawUSDCModal: WithdrawUSDCModalState
  USDCPurchaseDetailsModal: USDCPurchaseDetailsModalState
  USDCTransactionDetailsModal: USDCTransactionDetailsModalState
  USDCManualTransferModal: USDCManualTransferModalState
  AddFundsModal: AddFundsModalState
  PremiumContentPurchaseModal: PremiumContentPurchaseModalState
  CoinflowWithdraw: CoinflowWithdrawModalState
  WaitForDownloadModal: WaitForDownloadModalState
  ArtistPick: ArtistPickModalState
  AlbumTrackRemoveConfirmation: AlbumTrackRemoveConfirmationModalState
}

export type ModalsState = BasicModalsState & StatefulModalsState

export type TrackModalOpenedActionPayload = {
  name: string
  source: ModalSource
  trackingData?: Record<string, any>
}

export type TrackModalClosedActionPayload = {
  name: string
}
