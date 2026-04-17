import { useMemo } from 'react'

import {
  makeLoadNextPage,
  useCollections,
  useLibraryCollections as useLibraryCollectionsQuery
} from '@audius/common/api'
import { Status } from '@audius/common/models'
import {
  libraryPageSelectors,
  reachabilitySelectors
} from '@audius/common/store'
import type { CommonState, CollectionType } from '@audius/common/store'
import { filterCollections } from '@audius/common/utils'
import { difference } from 'lodash'
import { useSelector } from 'react-redux'

import type { AppState } from 'app/store'
import {
  getIsDoneLoadingFromDisk,
  getOfflineCollectionsStatus
} from 'app/store/offline-downloads/selectors'
import { OfflineDownloadStatus } from 'app/store/offline-downloads/slice'

const { getIsReachable } = reachabilitySelectors
const {
  getCollectionsCategory,
  getSelectedCategoryLocalAlbumAdds,
  getSelectedCategoryLocalAlbumRemovals,
  getSelectedCategoryLocalPlaylistAdds,
  getSelectedCategoryLocalPlaylistRemovals
} = libraryPageSelectors

type UseLibraryCollectionsConfig = {
  filterValue?: string
  collectionType: CollectionType
}

export const useLibraryCollections = ({
  collectionType,
  filterValue
}: UseLibraryCollectionsConfig) => {
  const isDoneLoadingFromDisk = useSelector(getIsDoneLoadingFromDisk)
  const isReachable = useSelector(getIsReachable)
  const selectedCategory = useSelector(getCollectionsCategory)

  const locallyAddedCollectionIds = useSelector((state: CommonState) => {
    const ids =
      collectionType === 'albums'
        ? getSelectedCategoryLocalAlbumAdds(state)
        : getSelectedCategoryLocalPlaylistAdds(state)
    return ids
  })

  const locallyRemovedCollectionIds = useSelector((state: CommonState) => {
    const ids =
      collectionType === 'albums'
        ? getSelectedCategoryLocalAlbumRemovals(state)
        : getSelectedCategoryLocalPlaylistRemovals(state)
    return ids
  })

  const localCollectionIds = difference(
    locallyAddedCollectionIds,
    locallyRemovedCollectionIds
  )

  const { data: localCollections = [] } = useCollections(localCollectionIds)

  const filteredLocalCollectionIds = filterCollections(localCollections, {
    filterText: filterValue
  }).map((collection) => collection.playlist_id)

  const {
    data: fetchedCollectionIds,
    isFetching,
    isSuccess,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending
  } = useLibraryCollectionsQuery({
    collectionType,
    category: selectedCategory,
    query: filterValue,
    pageSize: 15,
    sortMethod: 'added_date',
    sortDirection: 'desc'
  })

  const filteredFetchedCollectionIds = difference(
    fetchedCollectionIds,
    localCollectionIds
  )

  const offlineCollectionIds = useSelector((state: AppState) => {
    const offlineCollectionsStatus = getOfflineCollectionsStatus(state)
    return Object.keys(offlineCollectionsStatus).filter(
      (k) => offlineCollectionsStatus[k] === OfflineDownloadStatus.SUCCESS
    )
  })

  const collectionIds = isReachable
    ? [...filteredLocalCollectionIds, ...filteredFetchedCollectionIds]
    : offlineCollectionIds

  const loadNextPage = useMemo(
    () =>
      makeLoadNextPage({
        isFetching,
        hasNextPage,
        fetchNextPage
      }),
    [isFetching, hasNextPage, fetchNextPage]
  )

  let status: Status
  if (isReachable) {
    status = isFetching
      ? Status.LOADING
      : isSuccess
        ? Status.SUCCESS
        : Status.ERROR
  } else {
    status = isDoneLoadingFromDisk ? Status.SUCCESS : Status.LOADING
  }

  return {
    collectionIds,
    hasNextPage,
    loadNextPage,
    status,
    isPending,
    isLoading,
    isFetchingNextPage,
    localCollectionCount: localCollectionIds.length
  }
}
