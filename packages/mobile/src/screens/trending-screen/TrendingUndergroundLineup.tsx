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
}

export const TrendingUndergroundLineup = ({
  header
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
      itemStyles={{ paddingTop: 16, paddingBottom: 0 }}
      pullToRefresh
    />
  )
}
