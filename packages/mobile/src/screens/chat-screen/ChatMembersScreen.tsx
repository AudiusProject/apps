import { useMemo } from 'react'

import { useCurrentUserId, useOtherChatUsers } from '@audius/common/api'

import { useRoute } from 'app/hooks/useRoute'
import { UserList } from 'app/screens/user-list-screen/UserList'
import { UserListScreen } from 'app/screens/user-list-screen/UserListScreen'

const messages = {
  title: 'Members'
}

export const ChatMembersScreen = () => {
  const { params } = useRoute<'ChatMembers'>()
  const { chatId } = params
  const { data: currentUserId } = useCurrentUserId()
  const otherUsers = useOtherChatUsers(chatId)

  const userIds = useMemo(
    () => [
      ...(currentUserId ? [currentUserId] : []),
      ...otherUsers.map((user) => user.user_id)
    ],
    [currentUserId, otherUsers]
  )

  return (
    <UserListScreen title={messages.title}>
      <UserList
        data={userIds}
        totalCount={userIds.length}
        isPending={otherUsers.length === 0}
        isFetchingNextPage={false}
        tag='CHAT_MEMBERS'
      />
    </UserListScreen>
  )
}
