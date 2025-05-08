import { useCallback, useState } from 'react'

import type { CommonState } from '@audius/common/store'
import {
  savedPageSelectors,
  LibraryCategory,
  SavedPageTabs,
  reachabilitySelectors
} from '@audius/common/store'
import { useSelector } from 'react-redux'

import { CollectionList } from 'app/components/collection-list'
import { VirtualizedScrollView } from 'app/components/core'
import { EmptyTileCTA } from 'app/components/empty-tile-cta'
import { FilterInput } from 'app/components/filter-input'

import { LoadingMoreSpinner } from './LoadingMoreSpinner'
import { NoTracksPlaceholder } from './NoTracksPlaceholder'
import { OfflineContentBanner } from './OfflineContentBanner'
import { useLibraryCollections } from './useLibraryCollections'

const { getCategory } = savedPageSelectors
const { getIsReachable } = reachabilitySelectors

const messages = {
  emptyAlbumFavoritesText: "You haven't favorited any albums yet.",
  emptyAlbumRepostsText: "You haven't reposted any albums yet.",
  emptyAlbumPurchasedText: "You haven't purchased any albums yet.",
  emptyAlbumAllText:
    "You haven't favorited, reposted, or purchased any albums yet.",
  inputPlaceholder: 'Filter Albums'
}

export const AlbumsTab = () => {
  const [filterValue, setFilterValue] = useState('')
  const {
    collectionIds,
    hasNextPage,
    loadNextPage,
    isPending,
    isFetchingNextPage
  } = useLibraryCollections({
    filterValue,
    collectionType: 'albums'
  })
  const isReachable = useSelector(getIsReachable)

  const handleEndReached = useCallback(() => {
    if (isReachable) {
      loadNextPage()
    }
  }, [isReachable, loadNextPage])

  const emptyTabText = useSelector((state: CommonState) => {
    const selectedCategory = getCategory(state, {
      currentTab: SavedPageTabs.ALBUMS
    })
    if (selectedCategory === LibraryCategory.All) {
      return messages.emptyAlbumAllText
    } else if (selectedCategory === LibraryCategory.Favorite) {
      return messages.emptyAlbumFavoritesText
    } else if (selectedCategory === LibraryCategory.Purchase) {
      return messages.emptyAlbumPurchasedText
    } else {
      return messages.emptyAlbumRepostsText
    }
  })

  const loadingSpinner = <LoadingMoreSpinner />
  const noItemsLoaded = !isPending && !collectionIds?.length && !filterValue

  return (
    <VirtualizedScrollView>
      {noItemsLoaded ? (
        !isReachable ? (
          <NoTracksPlaceholder />
        ) : (
          <EmptyTileCTA message={emptyTabText} />
        )
      ) : (
        <>
          <OfflineContentBanner />
          <FilterInput
            value={filterValue}
            placeholder={messages.inputPlaceholder}
            onChangeText={setFilterValue}
          />
          <CollectionList
            collectionType='album'
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            scrollEnabled={false}
            collectionIds={collectionIds}
            showCreateCollectionTile={!!isReachable}
            ListFooterComponent={
              isPending || (isFetchingNextPage && hasNextPage)
                ? loadingSpinner
                : null
            }
          />
        </>
      )}
    </VirtualizedScrollView>
  )
}
