import { useCallback } from 'react'

import { useUserPlaylists } from '@audius/common/api'
import { CreatePlaylistSource, ID, User } from '@audius/common/models'
import {
  profilePageSelectors,
  CommonState,
  CollectionSortMode
} from '@audius/common/store'
import { Box, Flex, LoadingSpinner } from '@audius/harmony'
import { GetPlaylistsByUserSortMethodEnum } from '@audius/sdk/services'
import { useSelector } from 'react-redux'

import { CollectionCard } from 'components/collection'
import { InfiniteCardLineup } from 'components/lineup/InfiniteCardLineup'
import UploadChip from 'components/upload/UploadChip'

import { EmptyTab } from './EmptyTab'
import styles from './ProfilePage.module.css'

const { getProfileCollectionSortMode } = profilePageSelectors

const mapSortMode = (mode: CollectionSortMode | undefined) => {
  if (mode === CollectionSortMode.SAVE_COUNT)
    return GetPlaylistsByUserSortMethodEnum.Popular
  return GetPlaylistsByUserSortMethodEnum.Recent
}

const messages = {
  emptyPlaylists: 'created any playlists'
}

type PlaylistsTabProps = {
  userId: ID | null
  profile: User
  isOwner: boolean
}

export const PlaylistsTab = ({
  userId,
  profile,
  isOwner
}: PlaylistsTabProps) => {
  const { handle, name, playlist_count } = profile
  const sortMode = useSelector((state: CommonState) =>
    getProfileCollectionSortMode(state, handle)
  )
  const {
    data: playlists = [],
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useUserPlaylists({
    userId,
    sortMethod: mapSortMode(sortMode),
    pageSize: 20
  })

  const handleLoadMore = useCallback(() => {
    if (!isFetchingNextPage) {
      fetchNextPage()
    }
  }, [fetchNextPage, isFetchingNextPage])

  const playlistCards = playlists.map((playlist) => {
    return (
      <CollectionCard
        key={playlist.playlist_id}
        id={playlist.playlist_id}
        size='m'
      />
    )
  })

  if (isOwner) {
    playlistCards.unshift(
      <UploadChip
        key='upload-chip'
        type='playlist'
        variant='card'
        isFirst={playlistCards.length === 0}
        source={CreatePlaylistSource.PROFILE_PAGE}
      />
    )
  }

  if (playlist_count !== 0 && isPending && !playlists.length) {
    return (
      <Flex justifyContent='center' mt='2xl'>
        <Box w={24}>
          <LoadingSpinner />
        </Box>
      </Flex>
    )
  }

  if (playlist_count === 0 && !playlists.length) {
    return (
      <EmptyTab isOwner={isOwner} name={name} text={messages.emptyPlaylists} />
    )
  }

  return (
    <InfiniteCardLineup
      cardsClassName={styles.cardLineup}
      cards={playlistCards}
      hasMore={hasNextPage}
      loadMore={handleLoadMore}
      isLoadingMore={isFetchingNextPage}
    />
  )
}
