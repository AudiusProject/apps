import { useCallback } from 'react'

import {
  useCurrentUserId,
  useUserAlbums,
  useProfileUser
} from '@audius/common/api'
import { CreatePlaylistSource } from '@audius/common/models'
import { useIsFocused } from '@react-navigation/native'

import { CollectionList } from 'app/components/collection-list/CollectionList'
import { spacing } from 'app/styles/spacing'

import { EmptyProfileTile } from '../EmptyProfileTile'

const emptyAlbums = []

export const AlbumsTab = () => {
  const { album_count = 0, user_id } =
    useProfileUser({
      select: (user) => ({
        album_count: user.album_count,
        user_id: user.user_id
      })
    }).user ?? {}
  const { data: accountUserId } = useCurrentUserId()
  const isOwner = accountUserId === user_id
  const isFocused = useIsFocused()

  const {
    data: albums,
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useUserAlbums({ userId: user_id }, { enabled: isFocused })

  const handleEndReached = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  return (
    <CollectionList
      collection={album_count > 0 || isOwner ? albums : emptyAlbums}
      style={{ paddingTop: spacing(3) }}
      ListEmptyComponent={
        <EmptyProfileTile tab='albums' style={{ marginTop: 0 }} />
      }
      disableTopTabScroll
      showsVerticalScrollIndicator={false}
      totalCount={album_count}
      collectionType='album'
      showCreateCollectionTile={isOwner}
      createPlaylistSource={CreatePlaylistSource.PROFILE_PAGE}
      isLoading={isPending}
      onEndReached={handleEndReached}
      isLoadingMore={isFetchingNextPage}
    />
  )
}
