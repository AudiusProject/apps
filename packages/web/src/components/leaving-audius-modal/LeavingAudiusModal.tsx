import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import { useLeavingAudiusModal } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Button,
  IconExternalLink,
  IconInfo,
  Text,
  Hint
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

import styles from './LeavingAudiusModal.module.css'

const messages = {
  title: 'Are You Sure?',
  body: 'This link is taking you to the following website',
  goBack: 'Go Back',
  visitSite: 'Visit Site'
}

export const LeavingAudiusModal = NiceModal.create(() => {
  const modal = useModal()
  // Continue reading the link payload from the redux slice that the
  // useLeavingAudiusModal createModal hook stores; visibility is now owned
  // by NiceModal via useModal().
  const { data } = useLeavingAudiusModal()
  const { link } = data

  const handleClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleOpen = useCallback(() => {
    window.open(link, '_blank', 'noreferrer,noopener')
    handleClose()
  }, [link, handleClose])

  return (
    <Modal
      bodyClassName={styles.modalBody}
      isOpen={modal.visible}
      onClose={handleClose}
      size={'small'}
    >
      <ModalHeader>
        <ModalTitle icon={<IconInfo />} title={messages.title} />
      </ModalHeader>
      <ModalContent className={styles.content}>
        <Text>{messages.body}</Text>
        <Hint icon={IconExternalLink} w='100%'>
          {link}
        </Hint>
      </ModalContent>
      <ModalFooter className={styles.footer}>
        <Button
          className={styles.button}
          variant='secondary'
          onClick={handleClose}
        >
          {messages.goBack}
        </Button>
        <Button className={styles.button} onClick={handleOpen}>
          {messages.visitSite}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register('LeavingAudiusModal', LeavingAudiusModal)
registerNiceModalId('LeavingAudiusModal')
