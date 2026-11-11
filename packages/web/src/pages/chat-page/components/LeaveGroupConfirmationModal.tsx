import { useCallback } from 'react'

import { chatActions } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  IconSignOut,
  Button,
  ModalContentText
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

const { leaveChat } = chatActions

const messages = {
  title: 'Leave Group',
  content:
    'Are you sure you want to leave this group? You won’t get new messages and the conversation will be removed from your inbox.',
  confirm: 'Leave Group',
  cancel: 'Cancel'
}

type LeaveGroupConfirmationModalProps = {
  isVisible: boolean
  onClose: () => void
  chatId?: string
}

export const LeaveGroupConfirmationModal = ({
  isVisible,
  onClose,
  chatId
}: LeaveGroupConfirmationModalProps) => {
  const dispatch = useDispatch()
  const handleConfirmClicked = useCallback(() => {
    if (chatId) {
      dispatch(leaveChat({ chatId }))
    }
    onClose()
  }, [dispatch, onClose, chatId])
  return (
    <Modal size='small' isOpen={isVisible} onClose={onClose}>
      <ModalHeader>
        <ModalTitle title={messages.title} icon={<IconSignOut />} />
      </ModalHeader>
      <ModalContent>
        <ModalContentText>{messages.content}</ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button variant='secondary' onClick={onClose} fullWidth>
          {messages.cancel}
        </Button>
        <Button variant='destructive' onClick={handleConfirmClicked} fullWidth>
          {messages.confirm}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
