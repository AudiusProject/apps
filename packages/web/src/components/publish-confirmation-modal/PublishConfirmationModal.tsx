import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import { usePublishConfirmationModal } from '@audius/common/store'
import {
  Button,
  Modal,
  ModalContent,
  ModalContentText,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  IconRocket
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

const getMessages = (contentType: 'track' | 'album' | 'playlist') => ({
  title: 'Confirm Release',
  description: `Are you sure you want to make this ${contentType} public? Your followers will be notified.`,
  cancel: 'Go Back',
  release: 'Release Now'
})

export const PublishConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const { data } = usePublishConfirmationModal()
  const { contentType, confirmCallback } = data

  const messages = getMessages(contentType)

  const handleClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleConfirm = useCallback(() => {
    confirmCallback()
    handleClose()
  }, [confirmCallback, handleClose])

  return (
    <Modal isOpen={modal.visible} onClose={handleClose} size='small'>
      <ModalHeader>
        <ModalTitle icon={<IconRocket />} title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <ModalContentText css={{ textAlign: 'center' }}>
          {messages.description}
        </ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button fullWidth variant='secondary' onClick={handleClose}>
          {messages.cancel}
        </Button>
        <Button variant='primary' fullWidth onClick={handleConfirm}>
          {messages.release}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register('PublishConfirmation', PublishConfirmationModal)
registerNiceModalId('PublishConfirmation')
