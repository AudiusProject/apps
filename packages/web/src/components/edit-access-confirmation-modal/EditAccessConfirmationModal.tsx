import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import { useEditAccessConfirmationModal } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  Button,
  Text,
  Flex
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

const messages = {
  title: 'Confirm Update',
  description:
    "You're about to change the audience for your content. This update may cause others to lose the ability to listen and share.",
  cancel: 'Cancel',
  confirm: 'Update Audience'
}

export const EditAccessConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const { data } = useEditAccessConfirmationModal()
  const { confirmCallback, cancelCallback } = data

  const handleClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleConfirm = useCallback(() => {
    confirmCallback()
    handleClose()
  }, [confirmCallback, handleClose])

  const handleCancel = useCallback(() => {
    cancelCallback?.()
    handleClose()
  }, [cancelCallback, handleClose])

  return (
    <Modal isOpen={modal.visible} onClose={handleClose} size='small'>
      <ModalHeader>
        <Flex alignSelf='center' gap='s'>
          <Text variant='label' size='xl' strength='strong'>
            {messages.title}
          </Text>
        </Flex>
      </ModalHeader>
      <ModalContent>
        <Flex justifyContent='center'>
          <Text variant='body' size='l' textAlign='center'>
            {messages.description}
          </Text>
        </Flex>
      </ModalContent>
      <ModalFooter>
        <Button variant='secondary' fullWidth onClick={handleCancel}>
          {messages.cancel}
        </Button>
        <Button variant='primary' fullWidth onClick={handleConfirm}>
          {messages.confirm}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register('EditAccessConfirmation', EditAccessConfirmationModal)
registerNiceModalId('EditAccessConfirmation')
