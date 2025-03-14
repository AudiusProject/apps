import { useTrackFavorites, useCollectionFavorites } from '@audius/common/api'
import { FavoriteType } from '@audius/common/models'
import { favoritesUserListSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import { UserList } from '../UserList'

export const FavoritesUserList = () => {
  const entityId = useSelector(favoritesUserListSelectors.getId)
  const entityType = useSelector(favoritesUserListSelectors.getFavoriteType)

  const trackQuery = useTrackFavorites(
    { trackId: entityId },
    { enabled: entityType === FavoriteType.TRACK }
  )

  const collectionQuery = useCollectionFavorites(
    { collectionId: entityId },
    { enabled: entityType === FavoriteType.PLAYLIST }
  )

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isPending } =
    entityType === FavoriteType.TRACK ? trackQuery : collectionQuery

  return (
    <UserList
      data={data}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      isPending={isPending}
      fetchNextPage={fetchNextPage}
    />
  )
}
