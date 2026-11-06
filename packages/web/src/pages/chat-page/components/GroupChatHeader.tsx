import { useState } from 'react'

import { useOtherChatUsers } from '@audius/common/api'
import { chatSelectors, CommonState } from '@audius/common/store'
import {
  Flex,
  IconButton,
  IconKebabHorizontal,
  IconSignOut,
  IconTrash,
  IconUserGroup,
  PopupMenu
} from '@audius/harmony'
import { useSelector } from 'react-redux'

import { DeleteChatConfirmationModal } from './DeleteChatConfirmationModal'
import { GroupChatUser } from './GroupChatUser'
import { GroupMembersModal } from './GroupMembersModal'
import { LeaveGroupConfirmationModal } from './LeaveGroupConfirmationModal'
import { useChatCategoryMenuItems } from './useChatCategoryMenuItems'

const { getChat } = chatSelectors

const messages = {
  chatSettings: 'Chat Settings',
  members: 'View Members',
  leave: 'Leave Group',
  delete: 'Delete Conversation'
}

export const GroupChatHeader = ({ chatId }: { chatId?: string }) => {
  const [isMembersVisible, setIsMembersVisible] = useState(false)
  const [isLeaveVisible, setIsLeaveVisible] = useState(false)
  const [isDeleteVisible, setIsDeleteVisible] = useState(false)
  const users = useOtherChatUsers(chatId)
  const chat = useSelector((state: CommonState) => getChat(state, chatId ?? ''))
  const categoryMenuItems = useChatCategoryMenuItems(chat)
  const memberIds =
    chat && !chat.is_blast ? chat.chat_members.map((m) => m.user_id) : []

  const overflowItems = [
    {
      text: messages.members,
      icon: <IconUserGroup />,
      onClick: () => setIsMembersVisible(true)
    },
    ...categoryMenuItems,
    {
      text: messages.delete,
      icon: <IconTrash />,
      onClick: () => setIsDeleteVisible(true)
    },
    {
      text: messages.leave,
      icon: <IconSignOut />,
      onClick: () => setIsLeaveVisible(true)
    }
  ]

  return (
    <>
      <Flex alignItems='center' gap='m' w='100%' css={{ minWidth: 0 }}>
        <Flex flex={1} css={{ minWidth: 0 }}>
          <GroupChatUser
            users={users}
            onClick={() => setIsMembersVisible(true)}
          />
        </Flex>
        <PopupMenu
          items={overflowItems}
          transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          renderTrigger={(ref, trigger) => (
            <IconButton
              ref={ref}
              aria-label={messages.chatSettings}
              icon={IconKebabHorizontal}
              color='default'
              onClick={() => trigger()}
            />
          )}
        />
      </Flex>
      <GroupMembersModal
        isVisible={isMembersVisible}
        onClose={() => setIsMembersVisible(false)}
        memberIds={memberIds}
      />
      <LeaveGroupConfirmationModal
        chatId={chatId}
        isVisible={isLeaveVisible}
        onClose={() => setIsLeaveVisible(false)}
      />
      <DeleteChatConfirmationModal
        chatId={chatId}
        isVisible={isDeleteVisible}
        onClose={() => setIsDeleteVisible(false)}
      />
    </>
  )
}
