import { useEffect, useMemo } from 'react'

import {
  getTrendingQueryKey,
  TRENDING_INITIAL_PAGE_SIZE,
  TRENDING_LOAD_MORE_PAGE_SIZE,
  useTrending
} from '@audius/common/api'
import { TimeRange } from '@audius/common/models'
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

const sourceFor = (timeRange: TimeRange) => {
  if (timeRange === TimeRange.WEEK) return 'DISCOVER_TRENDING_WEEK'
  if (timeRange === TimeRange.MONTH) return 'DISCOVER_TRENDING_MONTH'
  return 'DISCOVER_TRENDING_ALL_TIME'
}

type TrendingLineupProps = {
  timeRange: TimeRange
  header?: SectionListProps<unknown>['ListHeaderComponent']
  rankIconCount?: number
}

export const TrendingLineup = ({
  timeRange,
  header,
  rankIconCount
}: TrendingLineupProps) => {
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

  const { trackIds, isPending, isFetching, hasNextPage, loadNextPage } =
    useTrending(queryArgs)

  const querySource = useMemo(
    () => ({ queryKey: [...getTrendingQueryKey(queryArgs)] as unknown[] }),
    [queryArgs]
  )

  return (
    <TrackLineup
      trackIds={trackIds}
      source={sourceFor(timeRange)}
      querySource={querySource}
      isPending={isPending}
      isFetching={isFetching}
      hasNextPage={hasNextPage}
      loadNextPage={loadNextPage}
      pageSize={TRENDING_LOAD_MORE_PAGE_SIZE}
      initialPageSize={TRENDING_INITIAL_PAGE_SIZE}
      isTrending
      rankIconCount={rankIconCount}
      header={header}
      itemStyles={{ paddingTop: 16, paddingBottom: 0 }}
      pullToRefresh
    />
  )
}
