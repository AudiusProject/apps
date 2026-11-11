import { useRelatedArtists } from '@audius/common/api'
import { RELATED_ARTISTS_USER_LIST_TAG } from '@audius/common/store'

import { useProfileRoute } from 'app/hooks/useRoute'

import { UserList } from './UserList'
import { UserListScreen } from './UserListScreen'

const messages = {
  title: 'Related artists'
}

export const RelatedArtistsScreen = () => {
  const { params } = useProfileRoute<'RelatedArtists'>()
  const { userId } = params
  const { data, isFetchingNextPage, isPending, fetchNextPage } =
    useRelatedArtists({ artistId: userId })

  return (
    <UserListScreen title={messages.title}>
      <UserList
        data={data}
        isFetchingNextPage={isFetchingNextPage}
        isPending={isPending}
        fetchNextPage={fetchNextPage}
        tag={RELATED_ARTISTS_USER_LIST_TAG}
      />
    </UserListScreen>
  )
}
