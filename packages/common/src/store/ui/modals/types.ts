import { Action } from '@reduxjs/toolkit'

import { ModalSource } from '~/models/Analytics'

import { AddCashModalState } from './add-cash-modal'
import { AlbumTrackRemoveConfirmationModalState } from './album-track-remove-confirmation-modal'
import { AnnouncementModalState } from './announcement-modal'
import { ArtistPickModalState } from './artist-pick-modal'
import { BuySellModalState } from './buy-sell-modal'
import { CoinSuccessModalState } from './coin-success-modal'
import { CoinflowOnrampModalState } from './coinflow-onramp-modal'
import { CoinflowWithdrawModalState } from './coinflow-withdraw-modal'
import { ChatBlastModalState } from './create-chat-blast-modal'
import { DeleteTrackConfirmationModalState } from './delete-track-confirmation-modal'
import { DownloadTrackArchiveModalState } from './download-track-archive-modal'
import { EarlyReleaseConfirmationModalState } from './early-release-confirmation-modal'
import { EditAccessConfirmationModalState } from './edit-access-confirmation-modal'
import { FinalizeWinnersConfirmationModalState } from './finalize-winners-confirmation-modal'
import { HideContentConfirmationModalState } from './hide-confirmation-modal'
import { HostRemixContestModalState } from './host-remix-contest-modal'
import { InboxUnavailableModalState } from './inbox-unavailable-modal'
import { LeavingAudiusModalState } from './leaving-audius-modal'
import { PremiumContentPurchaseModalState } from './premium-content-purchase-modal'
import { PublishConfirmationModalState } from './publish-confirmation-modal'
import { ReplaceTrackConfirmationModalState } from './replace-track-confirmation-modal'
import { ReplaceTrackProgressModalState } from './replace-track-progress-modal'
import { UploadConfirmationModalState } from './upload-confirmation-modal'
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
  | 'ChallengeRewards'
  | 'ClaimAllRewards'
  | 'ClaimVestedCoinsModal'
  | 'LinkSocialRewardsExplainer'
  | 'APIRewardsExplainer'
  | 'TransferAudioMobileWarning'
  | 'MobileConnectWalletsDrawer'
  | 'Share'
  | 'HCaptcha'
  | 'BrowserPushPermissionConfirmation'
  | 'AudioBreakdown'
  | 'DeactivateAccountConfirmation'
  | 'FeedFilter'
  | 'PurchaseVendor'
  | 'TrendingGenreSelection'
  | 'SocialProof'
  | 'EditFolder'
  | 'EditTrack'
  | 'SignOutConfirmation'
  | 'Overflow'
  | 'AddToCollection'
  | 'DeletePlaylistConfirmation'
  | 'DeleteTrackConfirmation'
  | 'ReplaceTrackConfirmation'
  | 'ReplaceTrackProgress'
  | 'FeatureFlagOverride'
  | 'BuyAudio'
  | 'BuyAudioRecovery'
  | 'TransactionDetails'
  | 'StripeOnRamp'
  | 'CoinflowOnramp'
  | 'InboxSettings'
  | 'CommentSettings'
  | 'PrivateKeyExporter'
  | 'LockedContent'
  | 'PlaybackRate'
  | 'ProfileActions'
  | 'PublishContentModal'
  | 'LabelAccount'
  | 'DuplicateAddConfirmation'
  | 'PremiumContentPurchaseModal'
  | 'CreateChatModal'
  | 'ChatBlastModal'
  | 'InboxUnavailableModal'
  | 'LeavingAudiusModal'
  | 'UploadConfirmation'
  | 'EditAccessConfirmation'
  | 'EarlyReleaseConfirmation'
  | 'PublishConfirmation'
  | 'HideContentConfirmation'
  | 'WithdrawUSDCModal'
  | 'USDCPurchaseDetailsModal'
  | 'USDCTransactionDetailsModal'
  | 'USDCManualTransferModal'
  | 'AddCashModal'
  | 'Welcome'
  | 'CoinflowWithdraw'
  | 'WaitForDownloadModal'
  | 'ArtistPick'
  | 'AlbumTrackRemoveConfirmation'
  | 'PayoutWallet'
  | 'EditTrackFormOverflowMenu'
  | 'ExternalWalletSignUp'
  | 'ConnectedWallets'
  | 'Announcement'
  | 'Notification'
  | 'DownloadTrackArchive'
  | 'BuySellModal'
  | 'HostRemixContest'
  | 'ReceiveTokensModal'
  | 'SendTokensModal'
  | 'ArtistCoinDetailsModal'
  | 'FinalizeWinnersConfirmation'
  | 'CoinSuccessModal'

export type BasicModalsState = {
  [modal in Modals]: BaseModalState
}

export type StatefulModalsState = {
  CoinflowOnramp: CoinflowOnrampModalState
  CreateChatModal: CreateChatModalState
  ChatBlastModal: ChatBlastModalState
  ClaimVestedCoinsModal: ClaimVestedCoinsModalState
  InboxUnavailableModal: InboxUnavailableModalState
  LeavingAudiusModal: LeavingAudiusModalState
  WithdrawUSDCModal: WithdrawUSDCModalState
  USDCPurchaseDetailsModal: USDCPurchaseDetailsModalState
  USDCTransactionDetailsModal: USDCTransactionDetailsModalState
  USDCManualTransferModal: USDCManualTransferModalState
  AddCashModal: AddCashModalState
  PremiumContentPurchaseModal: PremiumContentPurchaseModalState
  CoinflowWithdraw: CoinflowWithdrawModalState
  WaitForDownloadModal: WaitForDownloadModalState
  ArtistPick: ArtistPickModalState
  AlbumTrackRemoveConfirmation: AlbumTrackRemoveConfirmationModalState
  UploadConfirmation: UploadConfirmationModalState
  EditAccessConfirmation: EditAccessConfirmationModalState
  EarlyReleaseConfirmation: EarlyReleaseConfirmationModalState
  PublishConfirmation: PublishConfirmationModalState
  HideContentConfirmation: HideContentConfirmationModalState
  DeleteTrackConfirmation: DeleteTrackConfirmationModalState
  ReplaceTrackConfirmation: ReplaceTrackConfirmationModalState
  ReplaceTrackProgress: ReplaceTrackProgressModalState
  FinalizeWinnersConfirmation: FinalizeWinnersConfirmationModalState
  Announcement: AnnouncementModalState
  Notification: BaseModalState
  DownloadTrackArchive: DownloadTrackArchiveModalState
  BuySellModal: BuySellModalState
  HostRemixContest: HostRemixContestModalState
  ReceiveTokensModal: ReceiveTokensModalState
  SendTokensModal: SendTokensModalState
  CoinSuccessModal: CoinSuccessModalState
  ArtistCoinDetailsModal: ArtistCoinDetailsModalState
}

export type ReceiveTokensModalState = BaseModalState & {
  mint?: string
}

export type SendTokensModalState = BaseModalState & {
  mint?: string
}

export type ArtistCoinDetailsModalState = BaseModalState & {
  mint?: string
}

export type ClaimVestedCoinsModalState = BaseModalState & {
  ticker: string
  claimable: number
  onClaim: (rewardsPoolPercentage: number) => void
  isClaimPending?: boolean
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
