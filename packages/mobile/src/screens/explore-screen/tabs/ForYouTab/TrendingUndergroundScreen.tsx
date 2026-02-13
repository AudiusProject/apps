import {
  lineupSelectors,
  trendingUndergroundPageLineupSelectors,
  trendingUndergroundPageLineupActions
} from '@audius/common/store'
import { useSelector } from 'react-redux'

import { Screen, ScreenContent, ScreenHeader } from 'app/components/core'
import { Lineup } from 'app/components/lineup'
const { makeGetLineupMetadatas } = lineupSelectors
const { getLineup } = trendingUndergroundPageLineupSelectors

const getTrendingUndergroundLineup = makeGetLineupMetadatas(getLineup)

const messages = {
  header: 'Underground Trending'
}

export const TrendingUndergroundScreen = () => {
  const lineup = useSelector(getTrendingUndergroundLineup)

  return (
    <Screen>
      <ScreenHeader text={messages.header} />
      <ScreenContent>
        <Lineup
          lineup={lineup}
          actions={trendingUndergroundPageLineupActions}
          rankIconCount={5}
          isTrending
          selfLoad
        />
      </ScreenContent>
    </Screen>
  )
}
