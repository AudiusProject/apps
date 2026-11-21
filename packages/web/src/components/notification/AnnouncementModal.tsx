import { useAnnouncementModal } from '@audius/common/store'
import { Modal, Scrollbar, IconClose as IconRemove } from '@audius/harmony'

import { MarkdownViewer } from 'components/markdown-viewer'

import styles from './AnnouncementModal.module.css'
import { IconAnnouncement } from './Notification/components/icons'

export const AnnouncementModal = () => {
  const { isOpen, data, onClose } = useAnnouncementModal()
  const { announcementNotification } = data

  if (!announcementNotification) return null

  return (
    <Modal
      bodyClassName={styles.modalContainer}
      isOpen={isOpen}
      showDismissButton
      onClose={onClose}
    >
      <div className={styles.panelContainer}>
        <div className={styles.header}>
          <IconRemove className={styles.iconRemove} onClick={onClose} />
          <IconAnnouncement />
          <div className={styles.title}>
            <MarkdownViewer
              className={styles.titleMarkdown}
              markdown={announcementNotification.title}
            />
          </div>
        </div>
        <Scrollbar className={styles.scrollContent}>
          <div className={styles.body}>
            <MarkdownViewer
              markdown={announcementNotification.longDescription ?? ''}
            />
          </div>
        </Scrollbar>
      </div>
    </Modal>
  )
}
