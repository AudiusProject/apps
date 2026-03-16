import { useCallback } from 'react'

import { useUserAlbums } from '@audius/common/api'
import { CreatePlaylistSource, ID, User } from '@audius/common/models'
import {
  profilePageSelectors,
  CommonState,
  CollectionSortMode
} from '@audius/common/store'
import { Box, Flex, LoadingSpinner } from '@audius/harmony'
import { GetAlbumsByUserSortMethodEnum } from '@audius/sdk/services'
import { useSelector } from 'react-redux'

import { CollectionCard } from 'components/collection'
import { InfiniteCardLineup } from 'components/lineup/InfiniteCardLineup'
import UploadChip from 'components/upload/UploadChip'

import { EmptyTab } from './EmptyTab'
import styles from './ProfilePage.module.css'

const { getProfileCollectionSortMode } = profilePageSelectors

const mapSortMode = (mode: CollectionSortMode | undefined) => {
  if (mode === CollectionSortMode.SAVE_COUNT)
    return GetAlbumsByUserSortMethodEnum.Popular
  return GetAlbumsByUserSortMethodEnum.Recent
}

const messages = {
  emptyAlbums: 'created any albums'
}

type AlbumsTabProps = {
  userId: ID | null
  profile: User
  isOwner: boolean
}

export const AlbumsTab = ({ userId, profile, isOwner }: AlbumsTabProps) => {
  const { handle, name, album_count } = profile
  const sortMode = useSelector((state: CommonState) =>
    getProfileCollectionSortMode(state, handle)
  )
  const {
    data: albums = [],
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useUserAlbums({
    userId,
    sortMethod: mapSortMode(sortMode),
    pageSize: 20
  })

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, isFetchingNextPage])

  const albumCards = albums.map((album) => {
    return (
      <CollectionCard key={album.playlist_id} id={album.playlist_id} size='m' />
    )
  })

  if (isOwner) {
    albumCards.unshift(
      <UploadChip
        key='upload-chip'
        type='album'
        variant='card'
        isFirst={albumCards.length === 0}
        source={CreatePlaylistSource.PROFILE_PAGE}
      />
    )
  }

  if (album_count !== 0 && isPending && !albums.length) {
    return (
      <Flex justifyContent='center' mt='2xl'>
        <Box w={24}>
          <LoadingSpinner />
        </Box>
      </Flex>
    )
  }

  if (album_count === 0 && !albums.length) {
    return (
      <EmptyTab isOwner={isOwner} name={name} text={messages.emptyAlbums} />
    )
  }

  return (
    <InfiniteCardLineup
      cardsClassName={styles.cardLineup}
      cards={albumCards}
      hasMore={hasNextPage}
      loadMore={handleLoadMore}
      isLoadingMore={isFetchingNextPage}
    />
  )
}
