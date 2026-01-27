import { TimeRange } from '@audius/common/models'
import { trendingPageSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import {
  IconAllTime,
  IconCalendarDay,
  IconCalendarMonth,
  IconTrending
} from '@audius/harmony-native'
import { Screen, ScreenContent, ScreenHeader } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { TopTabNavigator } from 'app/components/top-tab-bar'
import { useAppTabScreen } from 'app/hooks/useAppTabScreen'

import { TrendingFilterButton } from './TrendingFilterButton'
import { TrendingLineup } from './TrendingLineup'
const { getTrendingGenre } = trendingPageSelectors

const ThisWeekTab = () => {
  return (
    <TrendingLineup
      timeRange={TimeRange.WEEK}
      rankIconCount={5}
    />
  )
}
const ThisMonthTab = () => {
  return <TrendingLineup timeRange={TimeRange.MONTH} />
}

const AllTimeTab = () => {
  return <TrendingLineup timeRange={TimeRange.ALL_TIME} />
}

const trendingScreens = [
  {
    name: 'This Week',
    Icon: IconCalendarDay,
    component: ThisWeekTab
  },
  {
    name: 'This Month',
    Icon: IconCalendarMonth,
    component: ThisMonthTab
  },
  {
    name: 'All Time',
    Icon: IconAllTime,
    component: AllTimeTab
  }
]

export const TrendingScreen = () => {
  useAppTabScreen()

  return (
    <Screen url='Trending'>
      <ScreenPrimaryContent>
        <ScreenHeader text='Trending' icon={IconTrending}>
          <TrendingFilterButton />
        </ScreenHeader>
      </ScreenPrimaryContent>
      <ScreenContent>
        <ScreenSecondaryContent>
          <TopTabNavigator
            screens={trendingScreens}
            screenOptions={{ lazy: true }}
          />
        </ScreenSecondaryContent>
      </ScreenContent>
    </Screen>
  )
}
