import React, { useCallback, useState } from 'react'

import { useDebouncedCallback } from '@audius/common/hooks'
import { CreatePlaylistSource } from '@audius/common/models'
import type { CommonState } from '@audius/common/store'
import {
  libraryPageSelectors,
  LibraryCategory,
  LibraryPageTabs,
  reachabilitySelectors
} from '@audius/common/store'
import Animated, { Layout } from 'react-native-reanimated'
import { useSelector } from 'react-redux'

import { CollectionList } from 'app/components/collection-list'
import { VirtualizedScrollView } from 'app/components/core'
import { EmptyTileCTA } from 'app/components/empty-tile-cta'
import { FilterInput } from 'app/components/filter-input'

import { NoTracksPlaceholder } from './NoTracksPlaceholder'
import { OfflineContentBanner } from './OfflineContentBanner'
import { useLibraryCollections } from './useLibraryCollections'

const { getIsReachable } = reachabilitySelectors
const { getCategory } = libraryPageSelectors

const messages = {
  emptyPlaylistFavoritesText: "You haven't favorited any playlists yet.",
  emptyPlaylistRepostsText: "You haven't reposted any playlists yet.",
  emptyPlaylistAllText:
    "You haven't favorited, reposted, or purchased any playlists yet.",
  inputPlaceholder: 'Filter Playlists'
}

export const PlaylistsTab = () => {
  const [filterValue, setFilterValue] = useState('')
  const [debouncedFilterValue, setDebouncedFilterValue] = useState('')

  const handleChangeFilterValue = useDebouncedCallback(
    (value: string) => {
      setDebouncedFilterValue(value)
    },
    [setDebouncedFilterValue],
    300
  )

  const {
    collectionIds,
    loadNextPage,
    isPending,
    isFetchingNextPage,
    hasNextPage
  } = useLibraryCollections({
    filterValue: debouncedFilterValue,
    collectionType: 'playlists'
  })
  const isReachable = useSelector(getIsReachable)

  const handleEndReached = useCallback(() => {
    if (isReachable) {
      loadNextPage()
    }
  }, [isReachable, loadNextPage])

  const noItemsLoaded =
    !isPending && !collectionIds?.length && !debouncedFilterValue

  const emptyTabText = useSelector((state: CommonState) => {
    const selectedCategory = getCategory(state, {
      currentTab: LibraryPageTabs.PLAYLISTS
    })
    if (selectedCategory === LibraryCategory.All) {
      return messages.emptyPlaylistAllText
    } else if (selectedCategory === LibraryCategory.Favorite) {
      return messages.emptyPlaylistFavoritesText
    } else {
      return messages.emptyPlaylistRepostsText
    }
  })

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
            onChangeText={(text) => {
              setFilterValue(text)
              handleChangeFilterValue(text)
            }}
          />
          <Animated.View layout={Layout}>
            <CollectionList
              collectionType='playlist'
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              scrollEnabled={false}
              collectionIds={collectionIds ?? []}
              isLoadingMore={isFetchingNextPage && hasNextPage}
              showCreateCollectionTile={!!isReachable}
              createPlaylistSource={CreatePlaylistSource.LIBRARY_PAGE}
              isLoading={isPending && (collectionIds?.length ?? 0) === 0}
              totalCount={12}
            />
          </Animated.View>
        </>
      )}
    </VirtualizedScrollView>
  )
}
