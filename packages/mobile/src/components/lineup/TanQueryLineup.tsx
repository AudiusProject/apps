import type { ReactElement } from 'react'
import { memo, useCallback, useMemo, useRef } from 'react'

import type { LineupData as LineupQueryData } from '@audius/common/api'
import { useDebouncedCallback } from '@audius/common/hooks'
import type { ID, Lineup as LineupData } from '@audius/common/models'
import { Kind } from '@audius/common/models'
import type { CommonState, LineupBaseActions } from '@audius/common/store'
import { useFocusEffect } from '@react-navigation/native'
import { range } from 'lodash'
import type {
  SectionList as RNSectionList,
  SectionListProps,
  ViewStyle
} from 'react-native'
import { StyleSheet, View } from 'react-native'
import { useDispatch } from 'react-redux'

import { SectionList } from 'app/components/core'
import {
  CollectionTile,
  TrackTile,
  LineupTileSkeleton
} from 'app/components/lineup-tile'
import { useScrollToTop } from 'app/hooks/useScrollToTop'

import { Delineator } from './Delineator'
import type {
  LoadingLineupItem,
  LineupItem,
  LineupItemTileProps,
  LineupTileViewProps,
  TogglePlayConfig
} from './types'
import { LineupVariant } from './types'

// The inital multiplier for number of tracks to fetch on lineup load
// multiplied by the number of tracks that fit the screen height
export const INITIAL_LOAD_TRACKS_MULTIPLIER = 3
export const INITIAL_PLAYLISTS_MULTIPLER = 2

// Threshold for how far away from the bottom (of the list) the user has to be
// before fetching more tracks as a percentage of the list height
const LOAD_MORE_THRESHOLD = 0.5

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
  actions
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
  actions
}: LineupItemTileProps) {
  if (!item) return null
  if ('_loading' in item) {
    if (item._loading) {
      return <SkeletonTrackTileView itemStyles={itemStyles} />
    }
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
      />
    )
  }
  return null
})

export type LineupProps = {
  /** Object containing lineup actions such as setPage */
  actions: LineupBaseActions

  /** The maximum number of total tracks to fetch */
  maxEntries?: number

  /**
   * Whether or not to delineate the lineup by time of the `activityTimestamp`
   */
  delineate?: boolean

  /**
   * Do not scroll to top of lineup when containing tab navigator tab is pressed
   */
  disableTopTabScroll?: boolean

  /**
   * Optional payload to pass to the fetch action
   */
  fetchPayload?: any

  /**
   * Extra fetch payload (merged in with fetch action) used to pass extra information to lineup actions/reducers/sagas
   */
  extraFetchOptions?: Record<string, unknown>

  /**
   * When `true` hide the header when the lineup is empty
   */
  hideHeaderOnEmpty?: boolean

  /**
   * A header to display at the top of the lineup,
   * will scroll with the rest of the content
   */
  header?: SectionListProps<unknown>['ListHeaderComponent']

  /**
   * An optional component to render when the lineup has no contents
   * in it.
   */
  LineupEmptyComponent?: SectionListProps<unknown>['ListEmptyComponent']

  /** Are we in a trending lineup? Allows tiles to specialize their rendering */
  isTrending?: boolean

  /**
   * When `true` lineup waits until visible before fetching.
   * This is especcially needed for lineups inside collapsible-tab-view
   * which do not support tab-navigator lazy mode
   */
  lazy?: boolean

  /**
   * Indicator if a track should be displayed differently (ie. artist pick)
   * The leadingElementId is displayed at the top of the lineup
   */
  leadingElementId?: ID | null

  /**
   * A custom delineator to show after the leading element
   */
  leadingElementDelineator?: ReactElement

  /**
   * Map of indices to JSX Elements that can be used to delineate the elements from the rest
   */
  delineatorMap?: Record<number, ReactElement>

  /** The number of tracks to fetch in each request */
  limit?: number

  /**
   * The Lineup object containing entries
   */
  lineup: LineupData<LineupItem>

  /**
   * The Lineup selector, allowing the lineup to select lineup itself
   */
  lineupSelector?: (state: CommonState) => LineupData<LineupItem>

  /**
   * Function called to load more entries
   */
  loadMore?: (offset: number, limit: number, overwrite: boolean) => void

  /**
   * Function called on refresh
   */
  refresh?: () => void

  /**
   * Boolean indicating if currently fetching data for a refresh
   * Must be provided if `refresh` is provided
   */
  refreshing?: boolean

  /**
   * How many icons to show for top ranked entries in the lineup. Defaults to 0, showing none
   */
  rankIconCount?: number

  /**
   * Is the lineup responsible for initially fetching it's own data
   */
  selfLoad?: boolean

  /**
   * Which item to start the lineup at (previous items will not be rendered)
   */
  offset?: number

  /**
   * The variant of the Lineup
   */
  variant?: LineupVariant

  /**
   * Uniquely identifies Lineup's SectionList. Needed if rendered inside
   * another VirtualizedList.
   */
  listKey?: string

  /**
   * When `true` don't load more while lineup status is `LOADING`.
   * This helps prevent collisions with any in-flight loading from web-app
   */
  includeLineupStatus?: boolean
  /**
   * When `true`, add pull-to-refresh capability
   */
  pullToRefresh?: boolean

  /**
   * Function called when item is pressed
   */
  onPressItem?: (id: ID) => void

  /**
   * Styles to apply to the items, can be used to override the padding for example
   */
  itemStyles?: ViewStyle

  /**
   * Whether to show the play bar chin
   */
  hidePlayBarChin?: boolean

  // Tan query props
  pageSize: number
  initialPageSize?: number
  isFetching: boolean
  loadNextPage: () => void
  hasMore: boolean
  isPending: boolean
  queryData?: LineupQueryData[] | undefined
} & Pick<
  SectionListProps<unknown>,
  | 'showsVerticalScrollIndicator'
  | 'ListEmptyComponent'
  | 'ListFooterComponent'
  | 'keyboardShouldPersistTaps'
>

/** `Lineup` encapsulates the logic for displaying a list of items such as Tracks (e.g. prefetching items
 * displaying loading states, etc).
 */
export const TanQueryLineup = ({
  actions,
  delineate,
  disableTopTabScroll,
  fetchPayload,
  header,
  hideHeaderOnEmpty,
  isTrending,
  lazy,
  leadingElementId,
  leadingElementDelineator,
  delineatorMap,
  lineup,
  LineupEmptyComponent,
  loadNextPage,
  hasMore,
  pullToRefresh,
  rankIconCount = 0,
  refresh,
  offset = 0,
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
  isFetching,
  isPending,
  queryData = [],
  maxEntries = Infinity,
  hidePlayBarChin = false,
  ...listProps
}: LineupProps) => {
  const debouncedLoadNextPage = useDebouncedCallback(
    () => {
      loadNextPage()
    },
    [loadNextPage],
    100
  )
  const dispatch = useDispatch()
  const ref = useRef<RNSectionList>(null)

  // There is unfortunately a gap between queryData existing and the data making its way into the lineup
  const isLineupPending = queryData.length !== lineup.entries.length

  const isEmpty =
    !(isPending || isLineupPending) && !isFetching && queryData.length === 0

  const handleRefresh = () => {
    refresh?.()
  }

  const handleInView = useCallback(() => {
    dispatch(actions.setInView(true))
  }, [dispatch, actions])

  useFocusEffect(handleInView)

  const togglePlay = useCallback(
    ({ uid, id, source }: TogglePlayConfig) => {
      dispatch(actions.togglePlay(uid, id, source))
    },
    [actions, dispatch]
  )

  const renderItem = useCallback(
    ({
      index,
      item,
      indexOffset = 0
    }: {
      index: number
      item: LineupItem | LoadingLineupItem
      indexOffset?: number
    }) => {
      return (
        <>
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
          />
          {delineatorMap?.[index + indexOffset]
            ? delineatorMap[index + indexOffset]
            : null}
        </>
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
      delineatorMap
    ]
  )

  // Calculate the sections of data to provide to SectionList
  const sections: Section[] = useMemo(() => {
    const entries = lineup.entries

    // Apply offset and maxEntries to the lineup entries
    const items =
      maxEntries !== undefined
        ? entries.slice(offset, offset + maxEntries)
        : entries.slice(offset)

    const getSkeletonCount = () => {
      if (lineup.entries.length === 0 && (isPending || isLineupPending)) {
        return Math.min(maxEntries, initialPageSize ?? pageSize)
      }
      if (isFetching) {
        return Math.min(maxEntries, pageSize)
      }
      return 0
    }

    const skeletonItems = range(getSkeletonCount()).map(
      () => ({ _loading: true }) as LoadingLineupItem
    )

    if (leadingElementId !== undefined) {
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
    lineup.entries,
    maxEntries,
    offset,
    leadingElementId,
    isFetching,
    isLineupPending,
    initialPageSize,
    isPending,
    pageSize
  ])

  const scrollToTop = useCallback(() => {
    if (!isEmpty) {
      ref.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        animated: true
      })
    }
  }, [isEmpty])

  useScrollToTop(scrollToTop, disableTopTabScroll)

  const handleScroll = useCallback(
    ({ nativeEvent }) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - LOAD_MORE_THRESHOLD * layoutMeasurement.height
      ) {
        if (!isFetching && hasMore) {
          debouncedLoadNextPage()
        }
      }
    },
    [debouncedLoadNextPage, isFetching, hasMore]
  )

  const pullToRefreshProps = pullToRefresh
    ? // Need to disable refresh so scrolling the "ListEmptyComponent" doesn't trigger refresh
      {
        onRefresh: isEmpty ? undefined : handleRefresh,
        refreshing: isPending || isLineupPending
      }
    : {}

  const handleEndReached = useCallback(
    () => debouncedLoadNextPage(),
    [debouncedLoadNextPage]
  )

  return (
    <View style={styles.root}>
      <SectionList
        {...listProps}
        {...pullToRefreshProps}
        ref={ref}
        onScroll={handleScroll}
        ListHeaderComponent={hideHeaderOnEmpty && isEmpty ? undefined : header}
        ListFooterComponent={lineup.hasMore ? null : ListFooterComponent}
        hidePlayBarChin={true}
        ListEmptyComponent={LineupEmptyComponent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={LOAD_MORE_THRESHOLD}
        sections={isEmpty ? [] : sections}
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
      />
    </View>
  )
}
