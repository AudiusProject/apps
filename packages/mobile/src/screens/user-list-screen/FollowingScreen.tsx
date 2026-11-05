import { useFollowing, useUser } from '@audius/common/api'

import { useProfileRoute } from 'app/hooks/useRoute'

import { UserList } from './UserList'
import { UserListScreen } from './UserListScreen'

const messages = {
  title: 'Following'
}

export const FollowingScreen = () => {
  const { params } = useProfileRoute<'Following'>()
  const { userId } = params
  const { data: followerCount } = useUser(userId, {
    select: (user) => user.followee_count
  })
  const { data, isFetchingNextPage, isPending, fetchNextPage } = useFollowing({
    userId
  })

  return (
    <UserListScreen title={messages.title}>
      <UserList
        data={data}
        totalCount={followerCount}
        isFetchingNextPage={isFetchingNextPage}
        isPending={isPending}
        fetchNextPage={fetchNextPage}
        tag='FOLLOWING'
      />
    </UserListScreen>
  )
}
