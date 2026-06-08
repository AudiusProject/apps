import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import { useFinalizeWinnersConfirmationModal } from '@audius/common/store'
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
  title: 'Confirm Winners?',
  description: 'Are you sure you want to finalize your winners?',
  description2: 'All participants will be notified.',
  cancel: 'Go Back',
  confirm: 'Confirm'
}

export const FinalizeWinnersConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const { data } = useFinalizeWinnersConfirmationModal()
  const { confirmCallback, cancelCallback, isInitialSave } = data

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
        <Flex column justifyContent='center' gap='xl'>
          <Text variant='body' size='l'>
            {messages.description}
            {isInitialSave ? ` ${messages.description2}` : ''}
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

NiceModal.register(
  'FinalizeWinnersConfirmation',
  FinalizeWinnersConfirmationModal
)
registerNiceModalId('FinalizeWinnersConfirmation')
