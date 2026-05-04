import { ComponentType, lazy } from 'react'

import { Modals as ModalTypes } from '@audius/common/store'

import { CoinSuccessModal } from 'components/CoinSuccessModal'
import AppCTAModal from 'components/app-cta-modal/AppCTAModal'
import BrowserPushConfirmationModal from 'components/browser-push-confirmation-modal/BrowserPushConfirmationModal'
import CoinflowOnrampModal from 'components/coinflow-onramp-modal'
import ConfirmerPreview from 'components/confirmer-preview/ConfirmerPreview'
import EmbedModal from 'components/embed-modal/EmbedModal'
import { FeatureFlagOverrideModal } from 'components/feature-flag-override-modal'
import FirstUploadModal from 'components/first-upload-modal/FirstUploadModal'
import { PasswordResetModal } from 'components/password-reset/PasswordResetModal'
import { PremiumContentPurchaseModal } from 'components/premium-content-purchase-modal/PremiumContentPurchaseModal'
import { SendTokensModal } from 'components/send-tokens-modal'
import ConnectedMobileOverflowModal from 'components/track-overflow-modal/ConnectedMobileOverflowModal'
import UnfollowConfirmationModal from 'components/unfollow-confirmation-modal/UnfollowConfirmationModal'
import { UnsavedChangesDialog } from 'components/unsaved-changes-dialog/UnsavedChangesDialog'
import { UserListModal } from 'components/user-list-modal/UserListModal'
import { WithdrawUSDCModal } from 'components/withdraw-usdc-modal/WithdrawUSDCModal'
import { CoinflowWithdrawModal } from 'components/withdraw-usdc-modal/components/CoinflowWithdrawModal'
import { useIsMobile } from 'hooks/useIsMobile'
import TransferAudioMobileDrawer from 'pages/audio-page/components/modals/TransferAudioMobileDrawer'

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
  InboxSettings: InboxSettingsModal,
  CommentSettings: CommentSettingsModal,
  TransferAudioMobileWarning: TransferAudioMobileDrawer,
  BrowserPushPermissionConfirmation: BrowserPushConfirmationModal,
  PremiumContentPurchaseModal,
  CreateChatModal,
  WithdrawUSDCModal,
  CoinflowOnramp: CoinflowOnrampModal,
  StripeOnRamp: StripeOnRampModal,
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
