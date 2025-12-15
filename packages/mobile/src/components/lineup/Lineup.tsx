import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PlaybackSource, ID, UID } from '@audius/common/models'
import { Kind, Status } from '@audius/common/models'
import { useFocusEffect } from '@react-navigation/native'
import { range } from 'lodash'
import type { SectionList as RNSectionList, ViewStyle } from 'react-native'
import { Dimensions, StyleSheet, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { SectionList } from 'app/components/core'
import {
  CollectionTile,
  TrackTile,
  LineupTileSkeleton
} from 'app/components/lineup-tile'
import { useReachableEffect } from 'app/hooks/useReachabilityEffect'
import { useScrollToTop } from 'app/hooks/useScrollToTop'

import { Delineator } from './Delineator'
import { delineateByTime } from './delineate'
import type {
  LineupProps,
  LoadingLineupItem,
  LineupItem,
  LineupItemTileProps,
  LineupTileViewProps
} from './types'
import { LineupVariant } from './types'

type TogglePlayConfig = {
  uid: UID
  id: ID
  source: PlaybackSource
}

// The max number of tiles to load
const MAX_TILES_COUNT = 1000

// The max number of loading tiles to display if count prop passes
const MAX_COUNT_LOADING_TILES = 18

// The inital multiplier for number of tracks to fetch on lineup load
// multiplied by the number of tracks that fit the screen height
export const INITIAL_LOAD_TRACKS_MULTIPLIER = 3
export const INITIAL_PLAYLISTS_MULTIPLER = 2

// A multiplier for the number of tiles to fill a page to be
// loaded in on each call (after the intial call)
const TRACKS_AHEAD_MULTIPLIER = 2

// Threshold for how far away from the bottom (of the list) the user has to be
// before fetching more tracks as a percentage of the list height
const LOAD_MORE_THRESHOLD = 0.5

// The minimum inital multiplier for tracks to fetch on lineup load
// use so that multiple lineups on the same page can switch w/out a reload
const MINIMUM_INITIAL_LOAD_TRACKS_MULTIPLIER = 1

// tile height + margin
const totalTileHeight = {
  main: 152 + 16,
  playlist: 350
}

// Helper to calculate an item count based on the Lineup variant and a multiplier
export const getItemCount = (
  variant: LineupVariant,
  multiplier: number | (() => number)
) =>
  Math.ceil(
    (Dimensions.get('window').height / totalTileHeight[variant]) *
      (typeof multiplier === 'function' ? multiplier() : multiplier)
  )

// Calculate minimum, initial, and loadMore itemCounts
const useItemCounts = (variant: LineupVariant) =>
  useMemo(
    () => ({
      minimum: getItemCount(
        variant === LineupVariant.PLAYLIST
          ? LineupVariant.PLAYLIST
          : LineupVariant.MAIN,
        MINIMUM_INITIAL_LOAD_TRACKS_MULTIPLIER
      ),
      initial: getItemCount(variant, () =>
        variant === LineupVariant.PLAYLIST
          ? INITIAL_PLAYLISTS_MULTIPLER
          : INITIAL_LOAD_TRACKS_MULTIPLIER
      ),
      loadMore: getItemCount(variant, TRACKS_AHEAD_MULTIPLIER)
    }),
    [variant]
  )

const fallbackLineupSelector = (() => {}) as any

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  item: {
    padding: 16,
    paddingBottom: 0
  }
})

type Section = {
  delineate: boolean
  hasLeadingElement?: boolean
  title?: string
  data: Array<LineupItem | LoadingLineupItem>
}

const getLineupTileComponent = (item: LineupItem) => {
  if (item.kind === Kind.TRACKS || item.track_id) {
    if (item._marked_deleted) {
      return null
    }
    return TrackTile
  } else if (item.kind === Kind.COLLECTIONS || item.playlist_id) {
    return CollectionTile
  }
  return null
}

const SkeletonTrackTileView = memo(function SkeletonTrackTileView(props: {
  itemStyles?: ViewStyle
}) {
  const { itemStyles } = props
  return (
    <View style={[styles.item, itemStyles]}>
      <LineupTileSkeleton />
    </View>
  )
})

const LineupTileView = memo(function LineupTileView({
  item,
  index,
  isTrending,
  leadingElementId,
  rankIconCount,
  togglePlay,
  onPress,
  itemStyles,
  actions,
  showArtistPick
}: LineupTileViewProps) {
  const TrackOrCollectionTile = getLineupTileComponent(item)

  if (TrackOrCollectionTile) {
    return (
      <View
        style={{
          ...styles.item,
          ...itemStyles
        }}
      >
        <TrackOrCollectionTile
          {...item}
          id={item.id}
          index={index}
          isTrending={isTrending}
          togglePlay={togglePlay}
          onPress={onPress}
          uid={item.uid}
          actions={actions}
          showArtistPick={showArtistPick}
        />
      </View>
    )
  } else {
    return null
  }
})

// Using `memo` because FlatList renders these items
// And we want to avoid a full render when the props haven't changed
const LineupItemTile = memo(function LineupItemTile({
  item,
  index,
  isTrending,
  leadingElementId,
  rankIconCount,
  togglePlay,
  onPress,
  itemStyles,
  actions,
  showArtistPick
}: LineupItemTileProps) {
  if (!item) return null
  if ('_loading' in item) {
    return <SkeletonTrackTileView itemStyles={itemStyles} />
  } else {
    return (
      <LineupTileView
        item={item}
        index={index}
        isTrending={isTrending}
        leadingElementId={leadingElementId}
        rankIconCount={rankIconCount}
        togglePlay={togglePlay}
        onPress={onPress}
        itemStyles={itemStyles}
        actions={actions}
        showArtistPick={showArtistPick}
      />
    )
  }
})

/** `Lineup` encapsulates the logic for displaying a list of items such as Tracks (e.g. prefetching items
 * displaying loading states, etc).
 */
export const Lineup = ({
  actions,
  count,
  delineate,
  disableTopTabScroll,
  fetchPayload,
  header,
  hideHeaderOnEmpty,
  isTrending,
  lazy,
  leadingElementId,
  leadingElementDelineator,
  lineup: lineupProp,
  LineupEmptyComponent,
  lineupSelector = fallbackLineupSelector,
  loadMore,
  pullToRefresh,
  rankIconCount = 0,
  refresh: refreshProp,
  refreshing: refreshingProp = false,
  start = 0,
  variant = LineupVariant.MAIN,
  listKey,
  selfLoad,
  includeLineupStatus,
  limit = Infinity,
  extraFetchOptions,
  ListFooterComponent,
  onPressItem,
  itemStyles,
  initialPageSize,
  pageSize,
  tanQuery,
  showArtistPick = false,
  ...listProps
}: LineupProps) => {
  const dispatch = useDispatch()
  const ref = useRef<RNSectionList>(null)
  const [isPastLoadThreshold, setIsPastLoadThreshold] = useState(false)
  const [refreshing, setRefreshing] = useState(refreshingProp)
  const selectedLineup = useSelector(lineupSelector)
  const lineup = selectedLineup ?? lineupProp
  const { status, entries, inView: lineupInView } = lineup
  const lineupLength = entries.length
  const inView = lazy ? lineupInView : true

  const handleRefresh = useCallback(() => {
    if (!refreshing) {
      dispatch(
        actions.refreshInView(true, fetchPayload, null, extraFetchOptions)
      )
    }
    setRefreshing(true)
  }, [refreshing, dispatch, actions, fetchPayload, extraFetchOptions])

  useEffect(() => {
    if (status !== Status.LOADING) {
      setRefreshing(false)
    }
  }, [status])

  const refresh = refreshProp ?? handleRefresh

  const handleInView = useCallback(() => {
    dispatch(actions.setInView(true))
  }, [dispatch, actions])

  useFocusEffect(handleInView)

  const itemCounts = useItemCounts(variant)

  // Item count based on the current page
  const pageItemCount =
    itemCounts.initial + (lineup.page - 1) * itemCounts.loadMore

  // Either the provided count or a default
  const countOrDefault = count !== undefined ? count : MAX_TILES_COUNT

  const handleLoadMore = useCallback(
    (reset?: boolean) => {
      if (tanQuery && loadMore) {
        loadMore(0, 0, true)
      } else if (tanQuery && !loadMore) {
        return
      }

      const {
        deleted = 0,
        nullCount = 0,
        entries,
        hasMore,
        page,
        status
      } = lineup

      const offset = lineupLength + deleted + nullCount

      const shouldLoadMore =
        // Lineup has more items to load
        hasMore &&
        // Number of loaded items does not exceed max count
        lineupLength < countOrDefault &&
        // Page item count doesn't exceed current offset
        (page === 0 || pageItemCount <= offset) &&
        entries.length < limit &&
        (includeLineupStatus ? status !== Status.LOADING : true)

      if (shouldLoadMore || reset) {
        const _offset = reset ? 0 : offset
        const _page = reset ? 0 : page
        const itemLoadCount = itemCounts.initial + _page * itemCounts.loadMore

        if (!reset) {
          dispatch(actions.setPage(page + 1))
        }

        const limit = Math.max(
          0,
          Math.min(
            itemLoadCount,
            Math.max(countOrDefault, itemCounts.minimum)
          ) - _offset
        )

        // Don't fetch more if the limit isn't a positive number.
        // This is a sign that we've loaded all the content for the lineup.
        if (limit <= 0) return

        if (loadMore) {
          loadMore(_offset, limit, _page === 0)
        } else {
          dispatch(
            actions.fetchLineupMetadatas(
              _offset,
              limit,
              _page === 0,
              fetchPayload,
              extraFetchOptions
            )
          )
        }
      }
    },
    [
      tanQuery,
      loadMore,
      lineup,
      lineupLength,
      countOrDefault,
      pageItemCount,
      limit,
      includeLineupStatus,
      itemCounts.initial,
      itemCounts.loadMore,
      itemCounts.minimum,
      dispatch,
      actions,
      fetchPayload,
      extraFetchOptions
    ]
  )

  useReachableEffect(
    useCallback(() => {
      if (status === Status.LOADING || !inView) return
      handleLoadMore(true)
    }, [status, inView, handleLoadMore]),
    false
  )

  // When scrolled past the end threshold of the lineup and the lineup is not loading,
  // trigger another load
  useEffect(() => {
    if (isPastLoadThreshold && status !== Status.LOADING && inView) {
      setIsPastLoadThreshold(false)
      handleLoadMore()
    }
  }, [isPastLoadThreshold, status, handleLoadMore, inView])

  useEffect(() => {
    if (selfLoad && status === Status.IDLE && inView) {
      handleLoadMore()
    }
  }, [handleLoadMore, selfLoad, lineupLength, status, inView])

  const togglePlay = useCallback(
    ({ uid, id, source }: TogglePlayConfig) => {
      dispatch(actions.togglePlay(uid, id, source))
    },
    [actions, dispatch]
  )

  const renderItem = useCallback(
    ({
      index,
      item
    }: {
      index: number
      item: LineupItem | LoadingLineupItem
    }) => {
      return (
        <LineupItemTile
          index={index}
          item={item}
          isTrending={isTrending}
          leadingElementId={leadingElementId}
          rankIconCount={rankIconCount}
          togglePlay={togglePlay}
          onPress={onPressItem}
          itemStyles={itemStyles}
          actions={actions}
          showArtistPick={showArtistPick}
        />
      )
    },
    [
      isTrending,
      leadingElementId,
      rankIconCount,
      togglePlay,
      onPressItem,
      itemStyles,
      actions,
      showArtistPick
    ]
  )

  // Calculate the sections of data to provide to SectionList
  const sections: Section[] = useMemo(() => {
    const { deleted, entries, hasMore, isMetadataLoading, page } = lineup

    // Apply offset and maxEntries to the lineup entries
    const items =
      pageSize !== undefined
        ? entries.slice(start, start + pageSize)
        : entries.slice(start)

    const itemDisplayCount = page <= 1 ? itemCounts.initial : pageItemCount

    const getSkeletonCount = () => {
      if (tanQuery && !loadMore && items.length > 0) return 0

      // Lineups like Feed load a different number of items on the first page
      if (initialPageSize && page === 0) {
        return initialPageSize
      }
      if (pageSize) {
        return count ? Math.min(count - items.length, pageSize) : pageSize
      }

      const shouldCalculateSkeletons =
        inView &&
        items.length < limit &&
        // Lineup has more items to load
        hasMore &&
        // Data is loading or about to start
        (items.length === 0 || isMetadataLoading) &&
        // There are fewer items than the max count
        items.length < countOrDefault

      if (shouldCalculateSkeletons) {
        // Calculate the number of skeletons to display: total # requested - # rendered - # deleted
        // If the `count` prop is provided, render the count - # loaded tiles
        const loadingSkeletonDifferential = Math.max(
          itemDisplayCount - items.length - deleted,
          0
        )
        return count
          ? Math.min(count - items.length, MAX_COUNT_LOADING_TILES)
          : loadingSkeletonDifferential
      }
      return 0
    }

    const skeletonItems = range(getSkeletonCount()).map(
      () => ({ _loading: true }) as LoadingLineupItem
    )

    if (delineate) {
      const result: Section[] = [
        ...delineateByTime(items),
        {
          delineate: false,
          data: skeletonItems
        }
      ]
      return result
    }

    if (leadingElementId) {
      const [artistPick, ...restEntries] = [...items, ...skeletonItems]

      const result: Section[] = [
        { delineate: false, data: [artistPick] },
        { delineate: true, data: restEntries, hasLeadingElement: true }
      ]
      return result
    }

    const data = [...items, ...skeletonItems]

    if (data.length === 0) {
      return []
    }

    return [{ delineate: false, data }]
  }, [
    lineup,
    pageSize,
    start,
    itemCounts.initial,
    pageItemCount,
    delineate,
    leadingElementId,
    tanQuery,
    loadMore,
    initialPageSize,
    inView,
    limit,
    countOrDefault,
    count
  ])

  const areSectionsEmpty = sections.every(
    (section) => section.data.length === 0
  )

  const scrollToTop = useCallback(() => {
    if (!areSectionsEmpty) {
      ref.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        animated: true
      })
    }
  }, [areSectionsEmpty])

  useScrollToTop(scrollToTop, disableTopTabScroll)

  const getItemLayout = useCallback(
    (_data: any, index: number) => {
      const itemHeight = totalTileHeight[variant]
      const offset = index * itemHeight
      return {
        length: itemHeight,
        offset,
        index
      }
    },
    [variant]
  )

  const handleScroll = useCallback(
    ({ nativeEvent }) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - LOAD_MORE_THRESHOLD * layoutMeasurement.height
      ) {
        if (!isPastLoadThreshold) {
          setIsPastLoadThreshold(true)
        }
      } else {
        if (isPastLoadThreshold) {
          setIsPastLoadThreshold(false)
        }
      }
    },
    [isPastLoadThreshold]
  )

  const pullToRefreshProps =
    pullToRefresh || refreshProp
      ? // Need to disable refresh so scrolling the "ListEmptyComponent" doesn't trigger refresh
        { onRefresh: areSectionsEmpty ? undefined : refresh, refreshing }
      : {}

  const handleEndReached = useCallback(() => handleLoadMore(), [handleLoadMore])

  return (
    <View style={styles.root}>
      <SectionList
        {...listProps}
        {...pullToRefreshProps}
        ref={ref}
        onScroll={handleScroll}
        ListHeaderComponent={
          hideHeaderOnEmpty && areSectionsEmpty ? undefined : header
        }
        ListFooterComponent={lineup.hasMore ? null : ListFooterComponent}
        ListEmptyComponent={LineupEmptyComponent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={LOAD_MORE_THRESHOLD}
        sections={areSectionsEmpty ? [] : sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item, index) => `${item?.id}-${index}`}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => {
          if (section.delineate) {
            if (section.hasLeadingElement && leadingElementDelineator) {
              return leadingElementDelineator
            }
            return <Delineator text={section.title} />
          }
          return null
        }}
        scrollIndicatorInsets={{ right: Number.MIN_VALUE }}
        // Perf optimizations
        initialNumToRender={5} // note: this will only affect loading skeletons
        maxToRenderPerBatch={5}
        windowSize={4}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
      />
    </View>
  )
}
