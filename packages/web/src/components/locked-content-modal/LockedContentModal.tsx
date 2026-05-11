import { useCallback } from 'react'

import { useGatedContentAccess, useLockedContent } from '@audius/common/hooks'
import { registerNiceModalId } from '@audius/common/services'
import {
  PurchaseableContentType,
  gatedContentActions
} from '@audius/common/store'
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  IconLock
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { GatedContentSection } from 'components/track/GatedContentSection'
import { LockedContentDetailsTile } from 'components/track/LockedContentDetailsTile'
import { useIsMobile } from 'hooks/useIsMobile'

import styles from './LockedContentModal.module.css'

const { resetLockedContentId } = gatedContentActions

const messages = {
  howToUnlock: 'HOW TO UNLOCK'
}

export const LockedContentModal = NiceModal.create(() => {
  const modal = useModal()
  const dispatch = useDispatch()
  const { track, owner } = useLockedContent()
  const { hasStreamAccess } = useGatedContentAccess(track)

  const handleClose = useCallback(() => {
    modal.hide()
    dispatch(resetLockedContentId())
  }, [modal, dispatch])

  const isMobile = useIsMobile()

  return (
    <ModalDrawer
      isOpen={modal.visible}
      onClose={handleClose}
      bodyClassName={styles.modalBody}
      dismissOnClickOutside
      isFullscreen={false}
    >
      <ModalHeader
        className={cn(styles.modalHeader, { [styles.mobile]: isMobile })}
        onClose={handleClose}
        dismissButtonClassName={styles.modalHeaderDismissButton}
        showDismissButton={!isMobile}
      >
        <ModalTitle
          title={messages.howToUnlock}
          icon={<IconLock className={styles.modalTitleIcon} />}
        />
      </ModalHeader>
      <ModalContent>
        {track && track.stream_conditions && owner && (
          <div className={styles.modalContent}>
            <LockedContentDetailsTile metadata={track} owner={owner} />
            <GatedContentSection
              isLoading={false}
              // TODO: album support?
              contentId={track.track_id}
              contentType={PurchaseableContentType.TRACK}
              streamConditions={track.stream_conditions}
              hasStreamAccess={hasStreamAccess}
              isOwner={false}
              wrapperClassName={styles.gatedContentSectionWrapper}
              className={styles.gatedContentSection}
              buttonClassName={styles.gatedContentSectionButton}
              ownerId={owner.user_id}
            />
          </div>
        )}
      </ModalContent>
    </ModalDrawer>
  )
})

NiceModal.register('LockedContent', LockedContentModal)
registerNiceModalId('LockedContent')
