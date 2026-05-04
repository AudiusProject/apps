import { ReactNode, useCallback } from 'react'

import { useCurrentUserId, useUser } from '@audius/common/api'
import { FollowSource, User } from '@audius/common/models'
import { registerNiceModalId } from '@audius/common/services'
import {
  chatActions,
  chatSelectors,
  ChatPermissionAction,
  useInboxUnavailableModal,
  usersSocialActions
} from '@audius/common/store'
import { CHAT_BLOG_POST_URL } from '@audius/common/utils'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  IconMessageUnblock as IconUnblockMessages,
  IconMessageLocked,
  Button,
  ModalContentText
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Action } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'

import { UserLink } from 'components/link/UserLink'

const { unblockUser, createChat } = chatActions
const { followUser } = usersSocialActions
const { useCanCreateChat } = chatSelectors

const messages = {
  title: 'Inbox Unavailable',
  content: "You can't send messages to this person.",
  button: 'Learn More',
  followRequired: (displayName: ReactNode) => (
    <>
      {'You must follow '}
      {displayName}
      {' before you can send them messages.'}
    </>
  ),
  follow: 'Follow',
  unblockContent: 'You cannot send messages to users you have blocked.',
  unblockButton: 'Unblock',
  defaultUsername: 'this user'
}

const actionToContent = ({
  action,
  user,
  onClose
}: {
  action: ChatPermissionAction
  user?: User | null
  onClose: () => void
}) => {
  switch (action) {
    case ChatPermissionAction.NONE:
      return {
        content: messages.content,
        buttonText: messages.button,
        buttonIcon: null
      }
    case ChatPermissionAction.FOLLOW:
      return {
        content: messages.followRequired(
          user ? <UserLink userId={user.user_id} /> : messages.defaultUsername
        ),
        buttonText: messages.follow,
        buttonIcon: null
      }
    case ChatPermissionAction.UNBLOCK:
      return {
        content: messages.unblockContent,
        buttonText: messages.unblockButton,
        buttonIcon: IconUnblockMessages
      }
    default:
      return {
        content: messages.content,
        buttonText: messages.button,
        buttonIcon: null
      }
  }
}

export const InboxUnavailableModal = NiceModal.create(() => {
  const modal = useModal()
  const { data } = useInboxUnavailableModal()
  const { userId, presetMessage, onSuccessAction, onCancelAction } = data
  const { data: user } = useUser(userId)
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { callToAction } = useCanCreateChat(userId)
  const hasAction =
    callToAction === ChatPermissionAction.FOLLOW ||
    callToAction === ChatPermissionAction.UNBLOCK

  const handleClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleClick = useCallback(() => {
    if (!userId) {
      console.error(
        'Unexpected undefined user for InboxUnavailableModal click handler'
      )
      return
    }
    if (callToAction === ChatPermissionAction.FOLLOW && currentUserId) {
      const followSuccessActions: Action[] = [
        chatActions.createChat({
          userIds: [userId]
        })
      ]
      if (onSuccessAction) {
        followSuccessActions.push(onSuccessAction)
      }
      dispatch(
        followUser(
          userId,
          FollowSource.INBOX_UNAVAILABLE_MODAL,
          undefined,
          followSuccessActions
        )
      )
    } else if (callToAction === ChatPermissionAction.UNBLOCK) {
      dispatch(unblockUser({ userId }))
      dispatch(createChat({ userIds: [userId], presetMessage }))
      if (onSuccessAction) {
        dispatch(onSuccessAction)
      }
    } else {
      window.open(CHAT_BLOG_POST_URL, '_blank')
    }
    handleClose()
  }, [
    userId,
    callToAction,
    currentUserId,
    handleClose,
    presetMessage,
    onSuccessAction,
    dispatch
  ])

  const handleCancel = useCallback(() => {
    if (onCancelAction) {
      dispatch(onCancelAction)
    }
    handleClose()
  }, [dispatch, onCancelAction, handleClose])

  const { content, buttonText, buttonIcon } = actionToContent({
    action: callToAction,
    user,
    onClose: handleClose
  })

  return (
    <Modal isOpen={modal.visible} onClose={handleClose} size='small'>
      <ModalHeader onClose={handleCancel}>
        <ModalTitle icon={<IconMessageLocked />} title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <ModalContentText>{content}</ModalContentText>
      </ModalContent>
      <ModalFooter>
        <Button
          variant={hasAction ? 'primary' : 'secondary'}
          fullWidth
          iconLeft={buttonIcon}
          onClick={handleClick}
        >
          {buttonText}
        </Button>
      </ModalFooter>
    </Modal>
  )
})

NiceModal.register('InboxUnavailableModal', InboxUnavailableModal)
registerNiceModalId('InboxUnavailableModal')
