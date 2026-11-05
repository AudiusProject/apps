import { useCurrentUserId, useFollowers } from '@audius/common/api'
import { ChatBlastAudience } from '@audius/sdk'

import { Flex } from '@audius/harmony-native'
import { useBottomBarInset } from 'app/components/core/BottomBarInsetContext'
import { useProfileRoute } from 'app/hooks/useRoute'

import { ChatBlastWithAudienceCTA } from '../chat-screen/ChatBlastWithAudienceCTA'

import { UserList } from './UserList'
import { UserListScreen } from './UserListScreen'

const messages = {
  title: 'Followers'
}

export const FollowersScreen = () => {
  const bottomBarInset = useBottomBarInset()
  const { params } = useProfileRoute<'Followers'>()
  const { userId } = params
  const { data: currentUserId } = useCurrentUserId()

  const { data, isFetchingNextPage, isPending, fetchNextPage } = useFollowers({
    userId
  })

  return (
    <UserListScreen title={messages.title}>
      <Flex flex={1} mb={bottomBarInset}>
        <UserList
          data={data}
          isFetchingNextPage={isFetchingNextPage}
          isPending={isPending}
          fetchNextPage={fetchNextPage}
          tag='FOLLOWERS'
          hideFollowsYou={currentUserId === userId}
        />
        {currentUserId === userId ? (
          <Flex w='100%'>
            <ChatBlastWithAudienceCTA audience={ChatBlastAudience.FOLLOWERS} />
          </Flex>
        ) : null}
      </Flex>
    </UserListScreen>
  )
}
