import { useCallback, useEffect } from 'react'

import {
  lineupSelectors,
  trendingUndergroundPageLineupActions,
  trendingUndergroundPageLineupSelectors
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { Lineup } from 'app/components/lineup'
import type { LineupProps } from 'app/components/lineup/types'

const { getLineup } = trendingUndergroundPageLineupSelectors
const { makeGetLineupMetadatas } = lineupSelectors

const getTrendingUndergroundLineup = makeGetLineupMetadatas(getLineup)

type TrendingUndergroundLineupProps = {
  header?: LineupProps['header']
}

export const TrendingUndergroundLineup = ({
  header
}: TrendingUndergroundLineupProps) => {
  const dispatch = useDispatch()

  useEffect(() => {
    return () => {
      dispatch(trendingUndergroundPageLineupActions.reset())
    }
  }, [dispatch])

  const handleLoadMore = useCallback(
    (offset: number, limit: number, overwrite: boolean) => {
      dispatch(
        trendingUndergroundPageLineupActions.fetchLineupMetadatas(
          offset,
          limit,
          overwrite
        )
      )
    },
    [dispatch]
  )

  return (
    <Lineup
      isTrending
      selfLoad
      pullToRefresh
      rankIconCount={5}
      header={header}
      lineupSelector={getTrendingUndergroundLineup}
      actions={trendingUndergroundPageLineupActions}
      loadMore={handleLoadMore}
      itemStyles={{ paddingTop: 16, paddingBottom: 0 }}
    />
  )
}
