import { useEventFollowers } from '@audius/common/api'

import { useRoute } from 'app/hooks/useRoute'

import { UserList } from '../user-list-screen/UserList'
import { UserListScreen } from '../user-list-screen/UserListScreen'

const messages = {
  title: 'Followers'
}

export const ContestFollowersScreen = () => {
  const { params } = useRoute<'ContestFollowers'>()
  const { eventId } = params

  const { userIds, isPending } = useEventFollowers({ eventId, limit: 100 })

  return (
    <UserListScreen title={messages.title}>
      <UserList
        data={userIds ?? []}
        isFetchingNextPage={false}
        isPending={isPending}
        tag='CONTEST_FOLLOWERS'
      />
    </UserListScreen>
  )
}
