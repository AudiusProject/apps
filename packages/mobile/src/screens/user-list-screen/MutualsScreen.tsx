import { useMutualFollowers } from '@audius/common/api'
import { MUTUALS_USER_LIST_TAG } from '@audius/common/store'

import { useProfileRoute } from 'app/hooks/useRoute'

import { UserList } from './UserList'
import { UserListScreen } from './UserListScreen'

const messages = {
  title: 'Mutuals'
}

export const MutualsScreen = () => {
  const { params } = useProfileRoute<'Mutuals'>()
  const { userId } = params
  const { data, isFetchingNextPage, isPending, fetchNextPage } =
    useMutualFollowers({ userId })

  return (
    <UserListScreen title={messages.title}>
      <UserList
        data={data}
        isFetchingNextPage={isFetchingNextPage}
        isPending={isPending}
        fetchNextPage={fetchNextPage}
        tag={MUTUALS_USER_LIST_TAG}
      />
    </UserListScreen>
  )
}
