import { useCallback, useState } from 'react'

import { useOtherChatUsers } from '@audius/common/api'
import { User } from '@audius/common/models'
import { chatSelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  IconButton,
  PopupMenu,
  IconMessageSlash,
  IconMessageUnblock,
  IconUser,
  IconTrash,
  IconError,
  IconKebabHorizontal,
  Flex
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { push } from 'utils/navigation'

import { BlockUserConfirmationModal } from './BlockUserConfirmationModal'
import { ChatUser } from './ChatUser'
import { DeleteChatConfirmationModal } from './DeleteChatConfirmationModal'
import { UnblockUserConfirmationModal } from './UnblockUserConfirmationModal'

const { getBlockees } = chatSelectors
const { profilePage } = route

const messages = {
  chatSettings: 'Chat Settings',
  block: 'Block Messages',
  unblock: 'Unblock Messages',
  report: 'Report Abuse',
  delete: 'Delete Conversation',
  visit: "Visit User's Profile"
}

export const UserChatHeader = ({ chatId }: { chatId?: string }) => {
  const dispatch = useDispatch()
  const [isUnblockUserModalVisible, setIsUnblockUserModalVisible] =
    useState(false)
  const [isBlockUserModalVisible, setIsBlockUserModalVisible] = useState(false)
  const [isReportAbuse, setIsReportAbuse] = useState(false)
  const [isDeleteChatModalVisible, setIsDeleteChatModalVisible] =
    useState(false)
  const users = useOtherChatUsers(chatId)
  const user: User | null = users[0] ?? null
  const blockeeList = useSelector(getBlockees)
  const isBlocked = user && blockeeList.includes(user.user_id)
  const handleUnblockClicked = useCallback(() => {
    setIsUnblockUserModalVisible(true)
  }, [setIsUnblockUserModalVisible])

  const handleBlockClicked = useCallback(() => {
    setIsBlockUserModalVisible(true)
  }, [setIsBlockUserModalVisible])

  const handleReportClicked = useCallback(() => {
    setIsReportAbuse(true)
    setIsBlockUserModalVisible(true)
  }, [setIsReportAbuse])

  const handleCloseBlockModal = useCallback(() => {
    setIsReportAbuse(false)
    setIsBlockUserModalVisible(false)
  }, [setIsReportAbuse])

  const handleVisitClicked = useCallback(() => {
    dispatch(push(profilePage(user.handle)))
  }, [dispatch, user])

  const handleDeleteClicked = useCallback(() => {
    setIsDeleteChatModalVisible(true)
  }, [setIsDeleteChatModalVisible])

  const overflowItems = [
    {
      text: messages.delete,
      icon: <IconTrash />,
      onClick: handleDeleteClicked
    },
    {
      text: messages.visit,
      icon: <IconUser />,
      onClick: handleVisitClicked
    },
    isBlocked
      ? {
          text: messages.unblock,
          icon: <IconMessageUnblock />,
          onClick: handleUnblockClicked
        }
      : {
          text: messages.block,
          icon: <IconMessageSlash />,
          onClick: handleBlockClicked
        },
    {
      text: messages.report,
      icon: <IconError />,
      onClick: handleReportClicked
    }
  ]
  return (
    <>
      {user ? (
        <>
          <Flex alignItems='center' gap='m' w='100%' css={{ minWidth: 0 }}>
            <Flex flex={1} css={{ minWidth: 0 }}>
              <ChatUser user={user} key={user.user_id} />
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
          <UnblockUserConfirmationModal
            user={user}
            isVisible={isUnblockUserModalVisible}
            onClose={() => setIsUnblockUserModalVisible(false)}
          />
          <BlockUserConfirmationModal
            user={user}
            isVisible={isBlockUserModalVisible}
            onClose={handleCloseBlockModal}
            isReportAbuse={isReportAbuse}
          />
          <DeleteChatConfirmationModal
            chatId={chatId}
            isVisible={isDeleteChatModalVisible}
            onClose={() => setIsDeleteChatModalVisible(false)}
          />
        </>
      ) : null}
    </>
  )
}
