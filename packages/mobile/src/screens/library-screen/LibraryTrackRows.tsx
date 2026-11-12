import { useCallback, useMemo } from 'react'

import type { ID, UID } from '@audius/common/models'
import { getNumericIdFromUid } from '@audius/common/utils'
import type { FlashListProps } from '@shopify/flash-list'
import { FlashList } from '@shopify/flash-list'

import { TrackRow } from '@audius/harmony-native'
import { TrackRowTile } from 'app/components/lineup-tile/TrackRowTile'

type LoadingItem = { _loading: true }
type Item = UID | LoadingItem

type LibraryTrackRowsProps = {
  uids?: UID[]
  /** Renders only skeleton rows. */
  showSkeleton?: boolean
  skeletonRowCount?: number
  /** Appends a page of skeleton rows while the next page loads. */
  hasNextPage?: boolean
  pageSize?: number
  togglePlay: (uid: UID, trackId: ID) => void
} & Pick<
  FlashListProps<Item>,
  | 'onEndReached'
  | 'onEndReachedThreshold'
  | 'ListFooterComponent'
  | 'ListHeaderComponent'
  | 'ListEmptyComponent'
  | 'keyboardShouldPersistTaps'
  | 'contentContainerStyle'
  | 'onScroll'
  | 'scrollEventThrottle'
>

const DEFAULT_PAGE_SIZE = 10
const MAX_SKELETON_ROWS = 50
const LOADING_ITEM: LoadingItem = { _loading: true }

const isLoadingItem = (item: Item): item is LoadingItem =>
  typeof item === 'object' && '_loading' in item

const keyExtractor = (item: Item, index: number) =>
  isLoadingItem(item) ? `loading-${index}` : item

/**
 * Library tracks as dense rows, the same row Trending and profiles use.
 * The list is full-bleed: the filter in its header and the page provide
 * the spacing, not a card.
 */
export const LibraryTrackRows = (props: LibraryTrackRowsProps) => {
  const {
    uids,
    showSkeleton,
    skeletonRowCount = 10,
    hasNextPage,
    pageSize = DEFAULT_PAGE_SIZE,
    togglePlay,
    ...listProps
  } = props

  const data = useMemo<Item[]>(() => {
    if (showSkeleton) {
      const count = Math.min(Math.max(skeletonRowCount, 1), MAX_SKELETON_ROWS)
      return Array.from({ length: count }, () => LOADING_ITEM)
    }
    const rows: Item[] = uids ?? []
    if (hasNextPage) {
      return [...rows, ...Array.from({ length: pageSize }, () => LOADING_ITEM)]
    }
    return rows
  }, [showSkeleton, skeletonRowCount, uids, hasNextPage, pageSize])

  const handleTogglePlay = useCallback(
    (args?: { uid?: UID; id: ID }) => {
      if (args?.uid) togglePlay(args.uid, args.id)
    },
    [togglePlay]
  )

  const renderItem = useCallback<
    NonNullable<FlashListProps<Item>['renderItem']>
  >(
    ({ item, index }) => {
      if (isLoadingItem(item)) return <TrackRow isLoading />
      return (
        <TrackRowTile
          id={getNumericIdFromUid(item)}
          uid={item}
          index={index}
          togglePlay={handleTogglePlay}
          showDownloadStatus
        />
      )
    },
    [handleTogglePlay]
  )

  return (
    <FlashList
      {...listProps}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
    />
  )
}
