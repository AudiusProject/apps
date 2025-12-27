import { ComponentType, lazy } from 'react'

import { Modals as ModalTypes } from '@audius/common/store'

import { CoinSuccessModal } from 'components/CoinSuccessModal'
import { AddCashModal } from 'components/add-cash-modal/AddCashModal'
import AddToCollectionModal from 'components/add-to-collection/desktop/AddToCollectionModal'
import { AlbumTrackRemoveConfirmationModal } from 'components/album-track-remove-confirmation-modal/AlbumTrackRemoveConfirmationModal'
import AppCTAModal from 'components/app-cta-modal/AppCTAModal'
import { ArtistPickModal } from 'components/artist-pick-modal/ArtistPickModal'
import BrowserPushConfirmationModal from 'components/browser-push-confirmation-modal/BrowserPushConfirmationModal'
import { BuySellModal } from 'components/buy-sell-modal/BuySellModal'
import CoinflowOnrampModal from 'components/coinflow-onramp-modal'
import ConfirmerPreview from 'components/confirmer-preview/ConfirmerPreview'
import DeletePlaylistConfirmationModal from 'components/delete-playlist-confirmation-modal/DeletePlaylistConfirmationModal'
import { DeleteTrackConfirmationModal } from 'components/delete-track-confirmation-modal/DeleteTrackConfirmationModal'
import { DownloadTrackArchiveModal } from 'components/download-track-archive-modal/DownloadTrackArchiveModal'
import { DuplicateAddConfirmationModal } from 'components/duplicate-add-confirmation-modal'
import { EarlyReleaseConfirmationModal } from 'components/early-release-confirmation-modal'
import { EditAccessConfirmationModal } from 'components/edit-access-confirmation-modal'
import EditFolderModal from 'components/edit-folder-modal/EditFolderModal'
import EmbedModal from 'components/embed-modal/EmbedModal'
import { FeatureFlagOverrideModal } from 'components/feature-flag-override-modal'
import { FinalizeWinnersConfirmationModal } from 'components/finalize-winners-confirmation-modal/FinalizeWinnersConfirmationModal'
import FirstUploadModal from 'components/first-upload-modal/FirstUploadModal'
import { HideContentConfirmationModal } from 'components/hide-confirmation-modal'
import { HostRemixContestModal } from 'components/host-remix-contest-modal/HostRemixContestModal'
import { InboxUnavailableModal } from 'components/inbox-unavailable-modal/InboxUnavailableModal'
import { LabelAccountModal } from 'components/label-account-modal/LabelAccountModal'
import { LeavingAudiusModal } from 'components/leaving-audius-modal/LeavingAudiusModal'
import { LockedContentModal } from 'components/locked-content-modal/LockedContentModal'
import { PasswordResetModal } from 'components/password-reset/PasswordResetModal'
import { PayoutWalletModal } from 'components/payout-wallet-modal/PayoutWalletModal'
import { PremiumContentPurchaseModal } from 'components/premium-content-purchase-modal/PremiumContentPurchaseModal'
import { PublishConfirmationModal } from 'components/publish-confirmation-modal/PublishConfirmationModal'
import { ReceiveTokensModal } from 'components/receive-tokens-modal'
import { ReplaceTrackConfirmationModal } from 'components/replace-track-confirmation-modal/ReplaceTrackConfirmationModal'
import { ReplaceTrackProgressModal } from 'components/replace-track-progress-modal/ReplaceTrackProgressModal'
import { ClaimAllRewardsModal } from 'components/rewards/modals/ClaimAllRewardsModal'
import TopAPIModal from 'components/rewards/modals/TopAPI'
import { SendTokensModal } from 'components/send-tokens-modal'
import { TipAudioModal } from 'components/tipping/tip-audio/TipAudioModal'
import ConnectedMobileOverflowModal from 'components/track-overflow-modal/ConnectedMobileOverflowModal'
import { TransactionDetailsModal } from 'components/transaction-details-modal'
import UnfollowConfirmationModal from 'components/unfollow-confirmation-modal/UnfollowConfirmationModal'
import { UnsavedChangesDialog } from 'components/unsaved-changes-dialog/UnsavedChangesDialog'
import { UploadConfirmationModal } from 'components/upload-confirmation-modal'
import { USDCPurchaseDetailsModal } from 'components/usdc-purchase-details-modal/USDCPurchaseDetailsModal'
import { USDCTransactionDetailsModal } from 'components/usdc-transaction-details-modal/USDCTransactionDetailsModal'
import TierExplainerModal from 'components/user-badges/TierExplainerModal'
import { UserListModal } from 'components/user-list-modal/UserListModal'
import { WaitForDownloadModal } from 'components/wait-for-download-modal/WaitForDownloadModal'
import { WelcomeModal } from 'components/welcome-modal/WelcomeModal'
import { WithdrawUSDCModal } from 'components/withdraw-usdc-modal/WithdrawUSDCModal'
import { CoinflowWithdrawModal } from 'components/withdraw-usdc-modal/components/CoinflowWithdrawModal'
import { useIsMobile } from 'hooks/useIsMobile'
import AudioBreakdownModal from 'pages/audio-page/components/modals/AudioBreakdownModal'
import { ConnectedWalletsModal } from 'pages/audio-page/components/modals/ConnectedWalletsModal'
import TransferAudioMobileDrawer from 'pages/audio-page/components/modals/TransferAudioMobileDrawer'
import { ChatBlastModal } from 'pages/chat-page/components/ChatBlastModal'
import { ClaimVestedCoinsModal } from 'pages/coin-detail-page/components/ClaimVestedCoinsModal'
import { ChallengeRewardsModal } from 'pages/rewards-page/components/modals/ChallengeRewardsModal'

import AppModal from './AppModal'
const ShareModal = lazy(() => import('components/share-modal'))

const StripeOnRampModal = lazy(() => import('components/stripe-on-ramp-modal'))

const CreateChatModal = lazy(
  () => import('pages/chat-page/components/CreateChatModal')
)

const TrendingRewardsModal = lazy(
  () => import('components/rewards/modals/TrendingRewardsModal')
)

const InboxSettingsModal = lazy(
  () => import('components/inbox-settings-modal/InboxSettingsModal')
)

const CommentSettingsModal = lazy(
  () => import('components/comment-settings-modal/CommentSettingsModal')
)

const commonModalsMap: { [Modal in ModalTypes]?: ComponentType } = {
  Share: ShareModal,
  EditFolder: EditFolderModal,
  AddToCollection: AddToCollectionModal,
  TiersExplainer: TierExplainerModal,
  DeletePlaylistConfirmation: DeletePlaylistConfirmationModal,
  DeleteTrackConfirmation: DeleteTrackConfirmationModal,
  HostRemixContest: HostRemixContestModal,
  ReplaceTrackConfirmation: ReplaceTrackConfirmationModal,
  ReplaceTrackProgress: ReplaceTrackProgressModal,
  DuplicateAddConfirmation: DuplicateAddConfirmationModal,
  FinalizeWinnersConfirmation: FinalizeWinnersConfirmationModal,
  AudioBreakdown: AudioBreakdownModal,
  UploadConfirmation: UploadConfirmationModal,
  EditAccessConfirmation: EditAccessConfirmationModal,
  EarlyReleaseConfirmation: EarlyReleaseConfirmationModal,
  PublishConfirmation: PublishConfirmationModal,
  HideContentConfirmation: HideContentConfirmationModal,
  AlbumTrackRemoveConfirmation: AlbumTrackRemoveConfirmationModal,
  TransactionDetails: TransactionDetailsModal,
  InboxSettings: InboxSettingsModal,
  CommentSettings: CommentSettingsModal,
  LabelAccount: LabelAccountModal,
  LockedContent: LockedContentModal,
  APIRewardsExplainer: TopAPIModal,
  TrendingRewardsExplainer: TrendingRewardsModal,
  ChallengeRewards: ChallengeRewardsModal,
  ClaimAllRewards: ClaimAllRewardsModal,
  ClaimVestedCoinsModal,
  TransferAudioMobileWarning: TransferAudioMobileDrawer,
  BrowserPushPermissionConfirmation: BrowserPushConfirmationModal,
  Welcome: WelcomeModal,
  PremiumContentPurchaseModal,
  LeavingAudiusModal,
  CreateChatModal,
  ChatBlastModal,
  InboxUnavailableModal,
  WithdrawUSDCModal,
  CoinflowOnramp: CoinflowOnrampModal,
  StripeOnRamp: StripeOnRampModal,
  USDCPurchaseDetailsModal,
  USDCTransactionDetailsModal,
  AddCashModal,
  CoinflowWithdraw: CoinflowWithdrawModal,
  WaitForDownloadModal,
  ArtistPick: ArtistPickModal,
  PayoutWallet: PayoutWalletModal,
  ConnectedWallets: ConnectedWalletsModal,
  DownloadTrackArchive: DownloadTrackArchiveModal,
  BuySellModal,
  ReceiveTokensModal,
  SendTokensModal
}

const commonModals = Object.entries(commonModalsMap) as [
  ModalTypes,
  ComponentType
][]

const Modals = () => {
  const isMobile = useIsMobile()

  return (
    <>
      <PasswordResetModal />
      <FirstUploadModal />
      <UnsavedChangesDialog />
      {commonModals.map(([modalName, Modal]) => {
        return <AppModal key={modalName} name={modalName} modal={Modal} />
      })}
      {isMobile ? (
        <>
          <ConnectedMobileOverflowModal />
          <UnfollowConfirmationModal />
        </>
      ) : (
        <>
          <EmbedModal />
          <UserListModal />
          <AppCTAModal />
          {/* dev-mode hot-key modals */}
          <ConfirmerPreview />
          <FeatureFlagOverrideModal />
        </>
      )}
      <TipAudioModal />
      <CoinSuccessModal />
    </>
  )
}

export default Modals
