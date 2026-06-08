import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import { useReplaceTrackConfirmationModal } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  Button,
  Text,
  Flex,
  Hint,
  IconError
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

const messages = {
  title: 'Are You Sure?',
  description: 'Are you sure you want to replace the file for this track?',
  hintText:
    'This change may impact accuracy of comment timestamps. Social metrics such as reposts won’t be affected.',
  cancel: 'Cancel',
  confirm: 'Confirm & Replace'
}

export const ReplaceTrackConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const { data } = useReplaceTrackConfirmationModal()
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
        <Flex justifyContent='center' direction='column' gap='xl'>
          <Text variant='body' size='l'>
            {messages.description}
          </Text>
          <Hint pv='s' icon={IconError}>
            {messages.hintText}
          </Hint>
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

NiceModal.register('ReplaceTrackConfirmation', ReplaceTrackConfirmationModal)
registerNiceModalId('ReplaceTrackConfirmation')
