import type { ReactNode } from 'react'
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

type TrendingUndergroundLineupProps = {
  header?: ReactNode
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
