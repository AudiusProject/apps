import { useState } from 'react'

import { trendingPageSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import { Flex, IconTrending } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { useAppTabScreen } from 'app/hooks/useAppTabScreen'

import { TRENDING_FILTER_MODAL } from './TrendingCombinedFilterDrawer'
import { TrendingFilterChips } from './TrendingFilterChips'
import { TrendingHeader } from './TrendingHeader'
import { TrendingTracksLineup } from './TrendingTracksLineup'
import { TrendingUndergroundLineup } from './TrendingUndergroundLineup'
import { TrendingWinnersView } from './TrendingWinnersView'

const { getTrendingCategory } = trendingPageSelectors

const titleByCategory = {
  tracks: 'Trending Tracks',
  underground: 'Trending Underground',
  winners: 'Trending Winners'
} as const

export const TrendingScreen = () => {
  useAppTabScreen()
  const category = useSelector(getTrendingCategory) ?? 'tracks'

  const [winnersWeek, setWinnersWeek] = useState<string | null>(null)
  const [winnersSubFilter, setWinnersSubFilter] = useState<
    'tracks' | 'underground'
  >('tracks')

  return (
    <Screen url='Trending'>
      <Flex flex={1} direction='column' style={{ minHeight: 0 }}>
        <ScreenPrimaryContent>
          <TrendingHeader
            title={titleByCategory[category]}
            icon={IconTrending}
            filterModal={TRENDING_FILTER_MODAL}
          />
        </ScreenPrimaryContent>
        <ScreenContent>
          {category === 'tracks' ? (
            <ScreenSecondaryContent>
              <TrendingTracksLineup header={<TrendingFilterChips />} />
            </ScreenSecondaryContent>
          ) : category === 'underground' ? (
            <ScreenSecondaryContent>
              <TrendingUndergroundLineup header={<TrendingFilterChips />} />
            </ScreenSecondaryContent>
          ) : (
            <ScreenSecondaryContent>
              <TrendingWinnersView
                week={winnersWeek}
                subFilter={winnersSubFilter}
                onWeekChange={setWinnersWeek}
                onSubFilterChange={setWinnersSubFilter}
              />
            </ScreenSecondaryContent>
          )}
        </ScreenContent>
      </Flex>
    </Screen>
  )
}
