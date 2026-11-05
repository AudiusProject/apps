import {
  useTrackFavorites,
  useCollectionFavorites,
  useCollection,
  useTrack
} from '@audius/common/api'
import { FavoriteType } from '@audius/common/models'

import { useRoute } from 'app/hooks/useRoute'

import { UserList } from './UserList'
import { UserListScreen } from './UserListScreen'

const messages = {
  title: 'Favorites'
}

export const FavoritedScreen = () => {
  const { params } = useRoute<'Favorited'>()
  const { id, favoriteType } = params

  const { data: followerCount } = useTrack(id, {
    select: (track) => track.save_count,
    enabled: favoriteType === FavoriteType.TRACK
  })

  const { data: collectionCount } = useCollection(id, {
    select: (collection) => collection.save_count,
    enabled: favoriteType === FavoriteType.PLAYLIST
  })

  const trackFavoritesQuery = useTrackFavorites(
    { trackId: id },
    { enabled: favoriteType === FavoriteType.TRACK }
  )

  const collectionFavoritesQuery = useCollectionFavorites(
    { collectionId: id },
    { enabled: favoriteType === FavoriteType.PLAYLIST }
  )

  const { data, isFetchingNextPage, isPending, fetchNextPage } =
    favoriteType === FavoriteType.TRACK
      ? trackFavoritesQuery
      : collectionFavoritesQuery

  return (
    <UserListScreen title={messages.title}>
      <UserList
        data={data}
        totalCount={
          favoriteType === FavoriteType.TRACK ? followerCount : collectionCount
        }
        isFetchingNextPage={isFetchingNextPage}
        isPending={isPending}
        fetchNextPage={fetchNextPage}
        tag='FAVORITES'
      />
    </UserListScreen>
  )
}
//
