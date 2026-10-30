import { useEffect, useMemo } from 'react'

import {
  getTrendingQueryKey,
  TRENDING_INITIAL_PAGE_SIZE,
  TRENDING_LOAD_MORE_PAGE_SIZE,
  useTrending
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { TimeRange } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  trendingPageActions,
  trendingPageSelectors
} from '@audius/common/store'
import { useNavigation } from '@react-navigation/native'
import type { SectionListProps } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { TrackLineup } from 'app/components/lineup/TrackLineup'

const { setTrendingTimeRange } = trendingPageActions
const { getTrendingGenre } = trendingPageSelectors

// Matches the query client's default staleTime.
const STALE_TIME_MS = 1000 * 60 * 5

// Trending is persisted to disk so it can paint on a cold start. A snapshot
// that was already stale when this session started gets refetched on mount,
// and painting it first means showing an old order and then reshuffling.
const sessionStartedAt = Date.now()

const sourceFor = (timeRange: TimeRange) => {
  if (timeRange === TimeRange.WEEK) return 'DISCOVER_TRENDING_WEEK'
  if (timeRange === TimeRange.MONTH) return 'DISCOVER_TRENDING_MONTH'
  return 'DISCOVER_TRENDING_ALL_TIME'
}

type TrendingLineupProps = {
  timeRange: TimeRange
  header?: SectionListProps<unknown>['ListHeaderComponent']
  contentContainerStyle?: SectionListProps<unknown>['contentContainerStyle']
  onScroll?: SectionListProps<unknown>['onScroll']
  rankIconCount?: number
}

export const TrendingLineup = ({
  timeRange,
  header,
  contentContainerStyle,
  onScroll,
  rankIconCount
}: TrendingLineupProps) => {
  const { isEnabled: isTrackRowsEnabled } = useFeatureFlag(
    FeatureFlags.TRACK_ROWS
  )
  const navigation = useNavigation()
  const dispatch = useDispatch()
  const genre = useSelector(getTrendingGenre)

  // Keep the redux "active time range" in sync with the selected tab — the
  // filter UI components read from it.
  useEffect(() => {
    // @ts-ignore tabPress is a tab navigator event
    const tabPressListener = navigation.addListener?.('tabPress', () => {
      dispatch(setTrendingTimeRange(timeRange))
    })
    return tabPressListener
  }, [navigation, dispatch, timeRange])

  const queryArgs = useMemo(
    () => ({
      timeRange,
      genre,
      initialPageSize: TRENDING_INITIAL_PAGE_SIZE,
      loadMorePageSize: TRENDING_LOAD_MORE_PAGE_SIZE
    }),
    [timeRange, genre]
  )

  const {
    trackIds,
    isPending,
    isFetching,
    isRefetching,
    dataUpdatedAt,
    hasNextPage,
    loadNextPage
  } = useTrending(queryArgs)

  // Show skeletons until the refetch of a stale restored snapshot lands. If
  // it fails, the snapshot is shown.
  const isRestoredStale =
    isRefetching && dataUpdatedAt < sessionStartedAt - STALE_TIME_MS

  const querySource = useMemo(
    () => ({ queryKey: [...getTrendingQueryKey(queryArgs)] as unknown[] }),
    [queryArgs]
  )

  return (
    <TrackLineup
      tileVariant={isTrackRowsEnabled ? 'row' : 'tile'}
      trackIds={isRestoredStale ? [] : trackIds}
      source={sourceFor(timeRange)}
      querySource={querySource}
      isPending={isPending || isRestoredStale}
      isFetching={isFetching}
      hasNextPage={hasNextPage}
      loadNextPage={loadNextPage}
      pageSize={TRENDING_LOAD_MORE_PAGE_SIZE}
      initialPageSize={TRENDING_INITIAL_PAGE_SIZE}
      isTrending
      rankIconCount={rankIconCount}
      header={header}
      contentContainerStyle={contentContainerStyle}
      onScroll={onScroll}
      itemStyles={{ paddingTop: 16, paddingBottom: 0 }}
      pullToRefresh
    />
  )
}
