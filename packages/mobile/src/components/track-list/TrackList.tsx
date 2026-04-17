import type { ReactElement } from 'react'
import { Fragment, useCallback, useMemo, useState } from 'react'

import type { ID, UID } from '@audius/common/models'
import type { FlashListProps } from '@shopify/flash-list'
import { FlashList } from '@shopify/flash-list'
import { View } from 'react-native'
import type {
  DragEndParams,
  DraggableFlatListProps
} from 'react-native-draggable-flatlist'
import DraggableFlatList, {
  OpacityDecorator
} from 'react-native-draggable-flatlist'

import * as haptics from 'app/haptics'

import type { TrackItemAction } from './TrackListItem'
import { TrackListItem } from './TrackListItem'
import { TrackListItemSkeleton } from './TrackListItemSkeleton'

type LoadingItem = {
  _loading: true
}

type BaseTrackListProps = {
  hideArt?: boolean
  // Accept ids as well as uids because some use cases don't have uids available
  // For example the EditPlaylist track list
  ids?: ID[]
  contextPlaylistId?: ID
  isAlbumPage?: boolean
  onRemove?: (index: number) => void
  showSkeleton?: boolean
  /** When `showSkeleton` is true, how many placeholder rows to render (capped). */
  skeletonRowCount?: number
  hasNextPage?: boolean
  pageSize?: number
  togglePlay?: (uid: string, trackId: ID) => void
  trackItemAction?: TrackItemAction
  uids?: UID[]
}

type TrackListProps = BaseTrackListProps &
  (
    | ({
        isReorderable: true
        onReorder?: DraggableFlatListProps<UID | ID>['onDragEnd']
      } & Partial<DraggableFlatListProps<UID | ID | LoadingItem>>)
    | ({
        isReorderable?: false
        onReorder?: never
      } & Partial<FlashListProps<UID | ID | LoadingItem>>)
  )

const noOp = () => {}
const keyExtractor = (item: string | number | LoadingItem) => {
  if (typeof item === 'object' && '_loading' in item)
    return `loading-${Math.random()}`
  return String(item)
}

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_INITIAL_SKELETON_COUNT = 8
const MAX_SKELETON_ROWS = 50

/**
 * A FlatList of tracks
 *
 * If isReorderable === true, make sure the TrackList is not nested in a ScrollView,
 * otherwise certain features like auto scroll while dragging will not work
 */
export const TrackList = (props: TrackListProps) => {
  const {
    contextPlaylistId,
    hideArt,
    ids,
    isReorderable,
    isAlbumPage = false,
    onRemove,
    onReorder,
    showSkeleton,
    skeletonRowCount,
    hasNextPage,
    pageSize = DEFAULT_PAGE_SIZE,
    togglePlay,
    trackItemAction,
    uids,
    ...otherProps
  } = props
  const data = useMemo(() => {
    const baseData = uids ?? ids ?? []
    if (hasNextPage) {
      // Add loading items at the end that will render as skeletons
      return [...baseData, ...new Array(pageSize).fill({ _loading: true })]
    }
    return baseData
  }, [uids, ids, hasNextPage, pageSize])
  const [scrollEnable, setScrollEnable] = useState(true)

  const renderSkeletonTrack = useCallback(() => <TrackListItemSkeleton />, [])

  const renderDraggableTrack: DraggableFlatListProps<
    UID | ID | LoadingItem
  >['renderItem'] = useCallback(
    ({ item, getIndex = () => -1, drag }) => {
      // If the item is a loading item, render a skeleton
      if (typeof item === 'object' && '_loading' in item) {
        return renderSkeletonTrack()
      }

      const index = getIndex() ?? -1
      const RootView = isReorderable ? OpacityDecorator : Fragment
      return (
        <RootView>
          <TrackListItem
            id={ids && (item as ID)}
            contextPlaylistId={contextPlaylistId}
            index={index}
            onDrag={drag}
            hideArt={hideArt}
            isReorderable={isReorderable}
            showViewAlbum={isAlbumPage}
            uid={uids && (item as UID)}
            key={item}
            togglePlay={togglePlay}
            trackItemAction={trackItemAction}
            onRemove={onRemove}
          />
        </RootView>
      )
    },
    [
      contextPlaylistId,
      hideArt,
      ids,
      isAlbumPage,
      isReorderable,
      onRemove,
      togglePlay,
      trackItemAction,
      uids,
      renderSkeletonTrack
    ]
  )

  const renderTrack: FlashListProps<UID | ID | LoadingItem>['renderItem'] =
    useCallback(
      ({ item, index }) =>
        renderDraggableTrack({
          item,
          getIndex: () => index,
          drag: noOp,
          isActive: false
        }) as ReactElement,
      [renderDraggableTrack]
    )

  const handleDragBegin = useCallback(() => {
    haptics.medium()
    setScrollEnable(false)
  }, [])

  const handleDragEnd = useCallback(
    (params: DragEndParams<string | number>) => {
      onReorder?.(params)
      setScrollEnable(true)
    },
    [onReorder]
  )

  if (showSkeleton) {
    const resolvedSkeletonCount = Math.min(
      Math.max(skeletonRowCount ?? DEFAULT_INITIAL_SKELETON_COUNT, 1),
      MAX_SKELETON_ROWS
    )
    return (
      <FlashList
        {...(otherProps as Partial<FlashListProps<UID | ID | LoadingItem>>)}
        data={
          data.length > 0
            ? data
            : Array.from({ length: resolvedSkeletonCount }, () => ({
                _loading: true
              }))
        }
        renderItem={renderSkeletonTrack}
        estimatedItemSize={60}
      />
    )
  }

  return isReorderable ? (
    <DraggableFlatList
      {...(otherProps as Partial<
        DraggableFlatListProps<UID | ID | LoadingItem>
      >)}
      autoscrollThreshold={200}
      activationDistance={scrollEnable ? 100 : 1}
      data={data}
      keyExtractor={keyExtractor}
      onDragBegin={handleDragBegin}
      onPlaceholderIndexChange={haptics.light}
      onDragEnd={handleDragEnd}
      renderItem={renderDraggableTrack}
      renderPlaceholder={() => <View />}
    />
  ) : (
    <FlashList
      {...(otherProps as Partial<FlashListProps<UID | ID | LoadingItem>>)}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderTrack}
      estimatedItemSize={60}
    />
  )
}
