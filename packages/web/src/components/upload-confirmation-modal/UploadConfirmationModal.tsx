import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import { useUploadConfirmationModal } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  IconCloudUpload as IconUpload,
  Button,
  Text,
  Flex
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

const messages = {
  title: 'Confirm Upload',
  publicDescription:
    'Ready to begin uploading? Your followers will be notified once your upload is complete.',
  hiddenDescription: 'Ready to begin uploading?',
  cancel: 'Go Back',
  upload: 'Upload'
}

export const UploadConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const { data } = useUploadConfirmationModal()
  const { confirmCallback, hasPublicTracks } = data

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
        <ModalTitle icon={<IconUpload />} title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <Flex justifyContent='center'>
          <Text variant='body' size='l' textAlign='center'>
            {hasPublicTracks
              ? messages.publicDescription
              : messages.hiddenDescription}
          </Text>
        </Flex>
      </ModalContent>
      <ModalFooter>
        <Button variant='secondary' fullWidth onClick={handleClose}>
          {messages.cancel}
        </Button>
        <Button variant='primary' fullWidth onClick={handleConfirm}>
          {messages.upload}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register('UploadConfirmation', UploadConfirmationModal)
registerNiceModalId('UploadConfirmation')
