import { useCallback } from 'react'

import { useCurrentUserId, useUsers } from '@audius/common/api'
import { route } from '@audius/common/utils'
import {
  Flex,
  IconUserGroup,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle
} from '@audius/harmony'
import { HashId } from '@audius/sdk'
import { useDispatch } from 'react-redux'

import { push } from 'utils/navigation'

import { ChatUser } from './ChatUser'

const { profilePage } = route

const messages = {
  title: 'Members'
}

type GroupMembersModalProps = {
  isVisible: boolean
  onClose: () => void
  memberIds: string[]
}

export const GroupMembersModal = ({
  isVisible,
  onClose,
  memberIds
}: GroupMembersModalProps) => {
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const ids = memberIds.map((id) => HashId.parse(id))
  const { data: users } = useUsers(ids)

  const handleUserClick = useCallback(
    (handle: string) => {
      onClose()
      dispatch(push(profilePage(handle)))
    },
    [dispatch, onClose]
  )

  // Current user last
  const sorted = [...(users ?? [])].sort(
    (a, b) =>
      Number(a.user_id === currentUserId) - Number(b.user_id === currentUserId)
  )

  return (
    <Modal size='small' isOpen={isVisible} onClose={onClose}>
      <ModalHeader>
        <ModalTitle title={messages.title} icon={<IconUserGroup />} />
      </ModalHeader>
      <ModalContent>
        <Flex column gap='l'>
          {sorted.map((user) => (
            <Flex
              key={user.user_id}
              css={{ cursor: 'pointer' }}
              onClick={() => handleUserClick(user.handle)}
            >
              <ChatUser user={user} disableNavigation />
            </Flex>
          ))}
        </Flex>
      </ModalContent>
    </Modal>
  )
}
