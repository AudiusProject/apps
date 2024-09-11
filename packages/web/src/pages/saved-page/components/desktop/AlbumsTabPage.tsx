import { useMemo } from 'react'

import { statusIsNotFinalized } from '@audius/common/models'
import {
  savedPageSelectors,
  LibraryCategory,
  SavedPageTabs,
  CommonState
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { useSelector } from 'react-redux'

import { CollectionCard } from 'components/collection'
import { InfiniteCardLineup } from 'components/lineup/InfiniteCardLineup'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import EmptyTable from 'components/tracks-table/EmptyTable'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useCollectionsData } from 'pages/saved-page/hooks/useCollectionsData'

import { emptyStateMessages } from '../emptyStateMessages'

import styles from './SavedPage.module.css'

const { TRENDING_PAGE } = route
const { getCategory } = savedPageSelectors

const messages = {
  emptyAlbumsBody: 'Once you have, this is where you’ll find them!',
  goToTrending: 'Go to Trending'
}

export const AlbumsTabPage = () => {
  const navigate = useNavigateToPage()
  const {
    status,
    hasMore,
    fetchMore,
    collections: albums
  } = useCollectionsData({ collectionType: 'album' })

  const emptyAlbumsHeader = useSelector((state: CommonState) => {
    const selectedCategory = getCategory(state, {
      currentTab: SavedPageTabs.ALBUMS
    })
    if (selectedCategory === LibraryCategory.All) {
      return emptyStateMessages.emptyAlbumAllHeader
    } else if (selectedCategory === LibraryCategory.Favorite) {
      return emptyStateMessages.emptyAlbumFavoritesHeader
    } else if (selectedCategory === LibraryCategory.Purchase) {
      return emptyStateMessages.emptyAlbumPurchasedHeader
    } else {
      return emptyStateMessages.emptyAlbumRepostsHeader
    }
  })

  const noResults = !statusIsNotFinalized(status) && albums?.length === 0

  const isLoadingInitial = statusIsNotFinalized(status) && albums?.length === 0

  const cards = useMemo(() => {
    return albums?.map(({ playlist_id }) => {
      return <CollectionCard key={playlist_id} id={playlist_id} size='m' />
    })
  }, [albums])

  if (isLoadingInitial) {
    return <LoadingSpinner className={styles.spinner} />
  }

  // TODO(nkang) - Add separate error state
  if (noResults || !albums) {
    return (
      <EmptyTable
        primaryText={emptyAlbumsHeader}
        secondaryText={messages.emptyAlbumsBody}
        buttonLabel={messages.goToTrending}
        onClick={() => navigate(TRENDING_PAGE)}
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
