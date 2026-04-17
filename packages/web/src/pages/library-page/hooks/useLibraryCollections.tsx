import { useMemo } from 'react'

import {
  makeLoadNextPage,
  useLibraryCollections as useLibraryCollectionsQuery
} from '@audius/common/api'
import { libraryPageSelectors, CommonState } from '@audius/common/store'
import { uniq } from 'lodash'
import { useSelector } from 'react-redux'

const {
  getCollectionsCategory,
  getSelectedCategoryLocalAlbumAdds,
  getSelectedCategoryLocalAlbumRemovals,
  getSelectedCategoryLocalPlaylistAdds,
  getSelectedCategoryLocalPlaylistRemovals
} = libraryPageSelectors

type LibraryCollectionsParams = {
  collectionType: 'album' | 'playlist'
  filterValue?: string
}

export const useLibraryCollections = ({
  collectionType,
  filterValue
}: LibraryCollectionsParams) => {
  const selectedCategory = useSelector(getCollectionsCategory)

  const locallyAddedCollectionIds = useSelector((state: CommonState) => {
    return collectionType === 'album'
      ? getSelectedCategoryLocalAlbumAdds(state)
      : getSelectedCategoryLocalPlaylistAdds(state)
  })

  const locallyRemovedCollectionIds = useSelector((state: CommonState) => {
    const ids =
      collectionType === 'album'
        ? getSelectedCategoryLocalAlbumRemovals(state)
        : getSelectedCategoryLocalPlaylistRemovals(state)
    return new Set(ids)
  })

  const {
    data: fetchedCollectionIds,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isFetching,
    fetchNextPage
  } = useLibraryCollectionsQuery({
    collectionType: collectionType === 'album' ? 'albums' : 'playlists',
    category: selectedCategory,
    query: filterValue,
    pageSize: 20,
    sortMethod: 'added_date',
    sortDirection: 'desc'
  })

  const loadNextPage = useMemo(
    () =>
      makeLoadNextPage({
        isFetching,
        hasNextPage,
        fetchNextPage
      }),
    [isFetching, hasNextPage, fetchNextPage]
  )

  const collectionIds = useMemo(() => {
    return uniq(
      [...locallyAddedCollectionIds, ...(fetchedCollectionIds || [])].filter(
        (playlistId) => !locallyRemovedCollectionIds.has(playlistId)
      )
    )
  }, [
    locallyAddedCollectionIds,
    fetchedCollectionIds,
    locallyRemovedCollectionIds
  ])

  return {
    hasNextPage,
    loadNextPage,
    collectionIds,
    isPending,
    isFetchingNextPage,
    localCollectionCount: locallyAddedCollectionIds.length
  }
}
