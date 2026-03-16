import { useCurrentUserId, useFollowers } from '@audius/common/api'
import { ChatBlastAudience } from '@audius/sdk/services'

import { Box, IconUserFollowers } from '@audius/harmony-native'
import { useProfileRoute } from 'app/hooks/useRoute'

import { ChatBlastWithAudienceCTA } from '../chat-screen/ChatBlastWithAudienceCTA'

import { UserList } from './UserList'
import { UserListScreen } from './UserListScreen'

const messages = {
  title: 'Followers'
}

export const FollowersScreen = () => {
  const { params } = useProfileRoute<'Followers'>()
  const { userId } = params
  const { data: currentUserId } = useCurrentUserId()

  const { data, isFetchingNextPage, isPending, fetchNextPage } = useFollowers({
    userId
  })

  return (
    <UserListScreen title={messages.title} titleIcon={IconUserFollowers}>
      <>
        <UserList
          data={data}
          isFetchingNextPage={isFetchingNextPage}
          isPending={isPending}
          fetchNextPage={fetchNextPage}
          tag='FOLLOWERS'
        />
        {currentUserId === userId ? (
          <Box w='100%' style={{ position: 'absolute', bottom: 0 }}>
            <ChatBlastWithAudienceCTA audience={ChatBlastAudience.FOLLOWERS} />
          </Box>
        ) : null}
      </>
    </UserListScreen>
  )
}
