import { ComponentType, lazy } from 'react'

import { Modals as ModalTypes } from '@audius/common/store'

import { CoinSuccessModal } from 'components/CoinSuccessModal'
import AppCTAModal from 'components/app-cta-modal/AppCTAModal'
import BrowserPushConfirmationModal from 'components/browser-push-confirmation-modal/BrowserPushConfirmationModal'
import ConfirmerPreview from 'components/confirmer-preview/ConfirmerPreview'
import { CreatePlaylistModal } from 'components/create-playlist-modal/CreatePlaylistModal'
import { DuplicatePlaylistModal } from 'components/duplicate-playlist-modal/DuplicatePlaylistModal'
import EmbedModal from 'components/embed-modal/EmbedModal'
import { FeatureFlagOverrideModal } from 'components/feature-flag-override-modal'
import FirstUploadModal from 'components/first-upload-modal/FirstUploadModal'
import { PasswordResetModal } from 'components/password-reset/PasswordResetModal'
import ConnectedMobileOverflowModal from 'components/track-overflow-modal/ConnectedMobileOverflowModal'
import UnfollowConfirmationModal from 'components/unfollow-confirmation-modal/UnfollowConfirmationModal'
import { UnsavedChangesDialog } from 'components/unsaved-changes-dialog/UnsavedChangesDialog'
import { UserListModal } from 'components/user-list-modal/UserListModal'
import { useIsMobile } from 'hooks/useIsMobile'

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
  BrowserPushPermissionConfirmation: BrowserPushConfirmationModal,
  CreateChatModal,
  StripeOnRamp: StripeOnRampModal,
  CreatePlaylistModal,
  DuplicatePlaylistModal
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
