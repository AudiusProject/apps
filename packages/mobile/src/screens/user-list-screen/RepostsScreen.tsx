import {
  useTrackReposts,
  useCollectionReposts,
  useCollection,
  useTrack
} from '@audius/common/api'
import { RepostType } from '@audius/common/store'

import { useRoute } from 'app/hooks/useRoute'

import { UserList } from './UserList'
import { UserListScreen } from './UserListScreen'

const messages = {
  title: 'Reposts'
}

export const RepostsScreen = () => {
  const { params } = useRoute<'Reposts'>()
  const { id, repostType } = params

  const { data: trackRepostCount } = useTrack(id, {
    select: (track) => track.repost_count,
    enabled: repostType === RepostType.TRACK
  })

  const { data: collectionRepostCount } = useCollection(id, {
    select: (collection) => collection.repost_count,
    enabled: repostType === RepostType.COLLECTION
  })

  const trackRepostsQuery = useTrackReposts(
    { trackId: id },
    { enabled: repostType === RepostType.TRACK }
  )

  const collectionRepostsQuery = useCollectionReposts(
    { collectionId: id },
    { enabled: repostType === RepostType.COLLECTION }
  )

  const { data, isFetchingNextPage, isPending, fetchNextPage } =
    repostType === RepostType.TRACK ? trackRepostsQuery : collectionRepostsQuery

  return (
    <UserListScreen title={messages.title}>
      <UserList
        data={data}
        totalCount={
          repostType === RepostType.TRACK
            ? trackRepostCount
            : collectionRepostCount
        }
        isFetchingNextPage={isFetchingNextPage}
        isPending={isPending}
        fetchNextPage={fetchNextPage}
        tag='REPOSTS'
      />
    </UserListScreen>
  )
}
