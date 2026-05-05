import { useCallback } from 'react'

import { chatActions, chatSelectors } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  IconCheck,
  Button,
  ModalContentText
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

const { markAllChatsAsRead } = chatActions
const { getChats, getUnreadMessagesCount } = chatSelectors

const messages = {
  title: 'Mark All as Read',
  content: (unreadCount: number, chatCount: number) =>
    `Mark ${unreadCount} unread ${
      unreadCount === 1 ? 'message' : 'messages'
    } across ${chatCount} ${
      chatCount === 1 ? 'conversation' : 'conversations'
    } as read?`,
  confirm: 'Mark as Read',
  cancel: 'Cancel'
}

type Props = {
  isVisible: boolean
  onClose: () => void
}

export const MarkAllAsReadConfirmationModal = ({ isVisible, onClose }: Props) => {
  const dispatch = useDispatch()
  const unreadCount = useSelector(getUnreadMessagesCount)
  const chats = useSelector(getChats)
  const unreadChatCount = chats.filter(
    (c) => !c.is_blast && (c.unread_message_count ?? 0) > 0
  ).length

  const handleConfirmClicked = useCallback(() => {
    dispatch(markAllChatsAsRead())
    onClose()
  }, [dispatch, onClose])

  return (
    <Modal size='small' isOpen={isVisible} onClose={onClose}>
      <ModalHeader>
        <ModalTitle title={messages.title} icon={<IconCheck />} />
      </ModalHeader>
      <ModalContent>
        <ModalContentText>
          {messages.content(unreadCount, unreadChatCount)}
        </ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button variant='secondary' onClick={onClose} fullWidth>
          {messages.cancel}
        </Button>
        <Button variant='primary' onClick={handleConfirmClicked} fullWidth>
          {messages.confirm}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
