import { useCallback } from 'react'

import { useUserAlbums } from '@audius/common/api'
import { useIsFocused } from '@react-navigation/native'
import { useSelector } from 'react-redux'

import { CollectionList } from 'app/components/collection-list/CollectionList'
import { spacing } from 'app/styles/spacing'

import { EmptyProfileTile } from '../EmptyProfileTile'
import { getIsOwner, useSelectProfile } from '../selectors'

const emptyAlbums = []

export const AlbumsTab = () => {
  const { handle, album_count, user_id } = useSelectProfile([
    'handle',
    'album_count',
    'user_id'
  ])
  const isOwner = useSelector((state) => getIsOwner(state, handle ?? ''))
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
      isLoading={isPending}
      onEndReached={handleEndReached}
      isLoadingMore={isFetchingNextPage}
    />
  )
}
