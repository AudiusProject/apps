import { useCallback } from 'react'

import { registerNiceModalId } from '@audius/common/services'
import { useEarlyReleaseConfirmationModal } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  Button,
  Text,
  Flex,
  IconRocket
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

const getMessages = (contentType: 'track' | 'album') => ({
  title: 'Confirm Early Release',
  description: `Do you want to release your ${contentType} now? Your followers will be notified.`,
  cancel: 'Cancel',
  confirm: 'Release Now'
})

export const EarlyReleaseConfirmationModal = NiceModal.create(() => {
  const modal = useModal()
  const { data } = useEarlyReleaseConfirmationModal()
  const { contentType, confirmCallback, cancelCallback } = data

  const messages = getMessages(contentType)

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
          <IconRocket color='default' size='l' />
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

NiceModal.register('EarlyReleaseConfirmation', EarlyReleaseConfirmationModal)
registerNiceModalId('EarlyReleaseConfirmation')
