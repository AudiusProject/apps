import { ComponentType, lazy } from 'react'

import { Modals as ModalTypes } from '@audius/common/store'

import { CoinSuccessModal } from 'components/CoinSuccessModal'
import AddToCollectionModal from 'components/add-to-collection/desktop/AddToCollectionModal'
import AppCTAModal from 'components/app-cta-modal/AppCTAModal'
import BrowserPushConfirmationModal from 'components/browser-push-confirmation-modal/BrowserPushConfirmationModal'
import CoinflowOnrampModal from 'components/coinflow-onramp-modal'
import ConfirmerPreview from 'components/confirmer-preview/ConfirmerPreview'
import EmbedModal from 'components/embed-modal/EmbedModal'
import { FeatureFlagOverrideModal } from 'components/feature-flag-override-modal'
import FirstUploadModal from 'components/first-upload-modal/FirstUploadModal'
import { HostRemixContestModal } from 'components/host-remix-contest-modal/HostRemixContestModal'
import { PasswordResetModal } from 'components/password-reset/PasswordResetModal'
import { PremiumContentPurchaseModal } from 'components/premium-content-purchase-modal/PremiumContentPurchaseModal'
import { ClaimAllRewardsModal } from 'components/rewards/modals/ClaimAllRewardsModal'
import TopAPIModal from 'components/rewards/modals/TopAPI'
import { SendTokensModal } from 'components/send-tokens-modal'
import ConnectedMobileOverflowModal from 'components/track-overflow-modal/ConnectedMobileOverflowModal'
import UnfollowConfirmationModal from 'components/unfollow-confirmation-modal/UnfollowConfirmationModal'
import { UnsavedChangesDialog } from 'components/unsaved-changes-dialog/UnsavedChangesDialog'
import { USDCPurchaseDetailsModal } from 'components/usdc-purchase-details-modal/USDCPurchaseDetailsModal'
import { USDCTransactionDetailsModal } from 'components/usdc-transaction-details-modal/USDCTransactionDetailsModal'
import { UserListModal } from 'components/user-list-modal/UserListModal'
import { WithdrawUSDCModal } from 'components/withdraw-usdc-modal/WithdrawUSDCModal'
import { CoinflowWithdrawModal } from 'components/withdraw-usdc-modal/components/CoinflowWithdrawModal'
import { useIsMobile } from 'hooks/useIsMobile'
import TransferAudioMobileDrawer from 'pages/audio-page/components/modals/TransferAudioMobileDrawer'
import { ClaimVestedCoinsModal } from 'pages/fan-club-detail-page/components/ClaimVestedCoinsModal'
import { ChallengeRewardsModal } from 'pages/rewards-page/components/modals/ChallengeRewardsModal'

import AppModal from './AppModal'

const StripeOnRampModal = lazy(() => import('components/stripe-on-ramp-modal'))

const CreateChatModal = lazy(
  () => import('pages/chat-page/components/CreateChatModal')
)

const InboxSettingsModal = lazy(
  () => import('components/inbox-settings-modal/InboxSettingsModal')
)

const CommentSettingsModal = lazy(
  () => import('components/comment-settings-modal/CommentSettingsModal')
)

const commonModalsMap: { [Modal in ModalTypes]?: ComponentType } = {
  AddToCollection: AddToCollectionModal,
  HostRemixContest: HostRemixContestModal,
  InboxSettings: InboxSettingsModal,
  CommentSettings: CommentSettingsModal,
  APIRewardsExplainer: TopAPIModal,
  ChallengeRewards: ChallengeRewardsModal,
  ClaimAllRewards: ClaimAllRewardsModal,
  ClaimVestedCoinsModal,
  TransferAudioMobileWarning: TransferAudioMobileDrawer,
  BrowserPushPermissionConfirmation: BrowserPushConfirmationModal,
  PremiumContentPurchaseModal,
  CreateChatModal,
  WithdrawUSDCModal,
  CoinflowOnramp: CoinflowOnrampModal,
  StripeOnRamp: StripeOnRampModal,
  USDCPurchaseDetailsModal,
  USDCTransactionDetailsModal,
  CoinflowWithdraw: CoinflowWithdrawModal,
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
      <CoinSuccessModal />
    </>
  )
}

export default Modals
