import { useCallback, useMemo } from 'react'

import { CreatePlaylistSource } from '@audius/common/models'
import {
  cacheCollectionsActions,
  libraryPageSelectors,
  LibraryCategory,
  LibraryPageTabs,
  CommonState
} from '@audius/common/store'
import { IconPlus } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { CollectionCard } from 'components/collection'
import { InfiniteCardLineup } from 'components/lineup/InfiniteCardLineup'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import EmptyTable from 'components/tracks-table/EmptyTable'
import UploadChip from 'components/upload/UploadChip'
import { useLibraryCollections } from 'pages/library-page/hooks/useLibraryCollections'

import { emptyStateMessages } from '../emptyStateMessages'

import styles from './LibraryPage.module.css'

const { createPlaylist } = cacheCollectionsActions
const { getCategory } = libraryPageSelectors

const messages = {
  emptyPlaylistsBody: 'Once you have, this is where you’ll find them!',
  createPlaylist: 'Create Playlist',
  newPlaylist: 'New Playlist'
}

export const PlaylistsTabPage = () => {
  const dispatch = useDispatch()
  const {
    hasNextPage,
    loadNextPage,
    collectionIds: playlistIds,
    isPending,
    isFetchingNextPage
  } = useLibraryCollections({
    collectionType: 'playlist'
  })
  const emptyPlaylistsHeader = useSelector((state: CommonState) => {
    const selectedCategory = getCategory(state, {
      currentTab: LibraryPageTabs.PLAYLISTS
    })
    if (selectedCategory === LibraryCategory.All) {
      return emptyStateMessages.emptyPlaylistAllHeader
    } else if (selectedCategory === LibraryCategory.Favorite) {
      return emptyStateMessages.emptyPlaylistFavoritesHeader
    } else {
      return emptyStateMessages.emptyPlaylistRepostsHeader
    }
  })

  const noResults = !isPending && playlistIds?.length === 0

  const handleCreatePlaylist = useCallback(() => {
    dispatch(
      createPlaylist(
        { playlist_name: messages.newPlaylist },
        CreatePlaylistSource.LIBRARY_PAGE
      )
    )
  }, [dispatch])

  const cards = useMemo(() => {
    const createPlaylistCard = (
      <UploadChip
        type='playlist'
        variant='card'
        source={CreatePlaylistSource.LIBRARY_PAGE}
      />
    )
    return [
      createPlaylistCard,
      ...playlistIds?.map((playlistId) => {
        return <CollectionCard key={playlistId} id={playlistId} size='m' />
      })
    ]
  }, [playlistIds])

  if (isPending) {
    return <LoadingSpinner className={styles.spinner} />
  }

  // TODO(nkang) - Add separate error state
  if (noResults || !playlistIds) {
    return (
      <EmptyTable
        primaryText={emptyPlaylistsHeader}
        secondaryText={messages.emptyPlaylistsBody}
        buttonLabel={messages.createPlaylist}
        buttonIcon={IconPlus}
        onClick={handleCreatePlaylist}
      />
    )
  }

  return (
    <InfiniteCardLineup
      hasMore={hasNextPage}
      loadMore={loadNextPage}
      cards={cards}
      cardsClassName={styles.cardsContainer}
      isLoadingMore={isFetchingNextPage}
    />
  )
}
