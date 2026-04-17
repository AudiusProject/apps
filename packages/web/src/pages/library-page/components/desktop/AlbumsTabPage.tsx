import { useMemo } from 'react'

import {
  libraryPageSelectors,
  LibraryCategory,
  LibraryPageTabs,
  CommonState
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import { useSelector } from 'react-redux'

import { CollectionCard, CollectionCardSkeleton } from 'components/collection'
import { InfiniteCardLineup } from 'components/lineup/InfiniteCardLineup'
import EmptyTable from 'components/tracks-table/EmptyTable'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useLibraryCollections } from 'pages/library-page/hooks/useLibraryCollections'

import { emptyStateMessages } from '../emptyStateMessages'

import styles from './LibraryPage.module.css'

const { TRENDING_PAGE } = route
const { getCategory } = libraryPageSelectors

const messages = {
  emptyAlbumsBody: 'Once you have, this is where you’ll find them!',
  goToTrending: 'Go to Trending'
}

export const AlbumsTabPage = () => {
  const navigate = useNavigateToPage()
  const {
    hasNextPage,
    loadNextPage,
    collectionIds: albumIds,
    isPending,
    isFetchingNextPage
  } = useLibraryCollections({ collectionType: 'album' })

  const emptyAlbumsHeader = useSelector((state: CommonState) => {
    const selectedCategory = getCategory(state, {
      currentTab: LibraryPageTabs.ALBUMS
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

  const noResults = !isPending && albumIds?.length === 0

  const cards = useMemo(() => {
    const loadedCards =
      albumIds?.map((albumId) => {
        return <CollectionCard key={albumId} id={albumId} size='m' />
      }) ?? []
    if (!isFetchingNextPage) return loadedCards
    return loadedCards.concat(
      Array.from({ length: 6 }, (_, i) => (
        <CollectionCardSkeleton key={`loading-${i}`} size='m' noShimmer />
      ))
    )
  }, [albumIds, isFetchingNextPage])

  if (isPending) {
    return (
      <div className={styles.cardsContainer}>
        {Array.from({ length: 12 }, (_, i) => (
          <CollectionCardSkeleton key={i} size='m' noShimmer />
        ))}
      </div>
    )
  }

  // TODO(nkang) - Add separate error state
  if (noResults || !albumIds) {
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
      hasMore={hasNextPage}
      loadMore={loadNextPage}
      cards={cards}
      cardsClassName={styles.cardsContainer}
    />
  )
}
