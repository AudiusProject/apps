import { useCallback, useEffect } from 'react'

import {
  lineupSelectors,
  trendingUndergroundPageLineupActions,
  trendingUndergroundPageLineupSelectors
} from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { Lineup } from 'app/components/lineup'

const { getLineup } = trendingUndergroundPageLineupSelectors
const { makeGetLineupMetadatas } = lineupSelectors

const getTrendingUndergroundLineup = makeGetLineupMetadatas(getLineup)

export const TrendingUndergroundLineup = () => {
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
      lineupSelector={getTrendingUndergroundLineup}
      actions={trendingUndergroundPageLineupActions}
      loadMore={handleLoadMore}
    />
  )
}
