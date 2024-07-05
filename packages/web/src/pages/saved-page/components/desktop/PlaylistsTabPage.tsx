import { useCallback, useMemo } from 'react'

import {
  CreatePlaylistSource,
  statusIsNotFinalized
} from '@audius/common/models'
import {
  cacheCollectionsActions,
  savedPageSelectors,
  LibraryCategory,
  SavedPageTabs,
  CommonState
} from '@audius/common/store'
import { IconPlus } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { CollectionCard } from 'components/collection'
import { InfiniteCardLineup } from 'components/lineup/InfiniteCardLineup'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import EmptyTable from 'components/tracks-table/EmptyTable'
import UploadChip from 'components/upload/UploadChip'
import { useCollectionsData } from 'pages/saved-page/hooks/useCollectionsData'

import { emptyStateMessages } from '../emptyStateMessages'

import styles from './SavedPage.module.css'

const { createPlaylist } = cacheCollectionsActions
const { getCategory } = savedPageSelectors

const messages = {
  emptyPlaylistsBody: 'Once you have, this is where you’ll find them!',
  createPlaylist: 'Create Playlist',
  newPlaylist: 'New Playlist'
}

export const PlaylistsTabPage = () => {
  const dispatch = useDispatch()
  const { status, hasMore, fetchMore, collections } = useCollectionsData({
    collectionType: 'playlist'
  })
  const selectedCategory = useSelector((state: CommonState) => {
    return getCategory(state, {
      currentTab: SavedPageTabs.PLAYLISTS
    })
  })
  const emptyPlaylistsHeader = useSelector((state: CommonState) => {
    if (selectedCategory === LibraryCategory.All) {
      return emptyStateMessages.emptyPlaylistAllHeader
    } else if (selectedCategory === LibraryCategory.Favorite) {
      return emptyStateMessages.emptyPlaylistFavoritesHeader
    } else {
      return emptyStateMessages.emptyPlaylistRepostsHeader
    }
  })

  const noResults = !statusIsNotFinalized(status) && collections?.length === 0
  const isLoadingInitial =
    statusIsNotFinalized(status) && collections?.length === 0

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
      ...collections
        ?.filter(
          // Hide private playlists unless category is purchase.
          (c) => !c.is_private
        )
        ?.map(({ playlist_id: id }) => {
          return <CollectionCard key={id} id={id} size='m' />
        })
    ]
  }, [collections])

  if (isLoadingInitial) {
    return <LoadingSpinner className={styles.spinner} />
  }

  // TODO(nkang) - Add separate error state
  if (noResults || !collections) {
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
      hasMore={hasMore}
      loadMore={fetchMore}
      cards={cards}
      cardsClassName={styles.cardsContainer}
      isLoadingMore={statusIsNotFinalized(status)}
    />
  )
}
