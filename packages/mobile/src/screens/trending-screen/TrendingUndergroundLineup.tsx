import { useMemo } from 'react'

import {
  getTrendingUndergroundQueryKey,
  useTrendingUnderground
} from '@audius/common/api'
import type { SectionListProps } from 'react-native'

import { TrackLineup } from 'app/components/lineup/TrackLineup'

const PAGE_SIZE = 10

type TrendingUndergroundLineupProps = {
  header?: SectionListProps<unknown>['ListHeaderComponent']
  contentContainerStyle?: SectionListProps<unknown>['contentContainerStyle']
  onScroll?: SectionListProps<unknown>['onScroll']
}

export const TrendingUndergroundLineup = ({
  header,
  contentContainerStyle,
  onScroll
}: TrendingUndergroundLineupProps) => {
  const { trackIds, isPending, isFetching, hasNextPage, loadNextPage } =
    useTrendingUnderground({ pageSize: PAGE_SIZE })

  const querySource = useMemo(
    () => ({
      queryKey: [
        ...getTrendingUndergroundQueryKey({ pageSize: PAGE_SIZE })
      ] as unknown[]
    }),
    []
  )

  return (
    <TrackLineup
      trackIds={trackIds}
      source='DISCOVER_TRENDING_UNDERGROUND'
      querySource={querySource}
      isPending={isPending}
      isFetching={isFetching}
      hasNextPage={hasNextPage}
      loadNextPage={loadNextPage}
      pageSize={PAGE_SIZE}
      isTrending
      rankIconCount={5}
      header={header}
      contentContainerStyle={contentContainerStyle}
      onScroll={onScroll}
      itemStyles={{ paddingTop: 16, paddingBottom: 0 }}
      pullToRefresh
    />
  )
}
