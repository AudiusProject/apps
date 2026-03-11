import { useEffect, useState } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { trendingPageActions, trendingPageSelectors } from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, IconTrending } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { useAppTabScreen } from 'app/hooks/useAppTabScreen'
import { MobileRootHeader } from 'app/screens/app-screen/MobileRootHeader'

import { TRENDING_FILTER_MODAL } from './TrendingCombinedFilterDrawer'
import { TrendingFilterButton } from './TrendingFilterButton'
import { TrendingFilterChips } from './TrendingFilterChips'
import { TrendingHeader } from './TrendingHeader'
import { TrendingTracksLineup } from './TrendingTracksLineup'
import { TrendingUndergroundLineup } from './TrendingUndergroundLineup'
import { TrendingWinnersView } from './TrendingWinnersView'

const { getTrendingCategory } = trendingPageSelectors
const { setTrendingCategory } = trendingPageActions

const titleByCategory = {
  tracks: 'Trending Tracks',
  underground: 'Trending Underground',
  winners: 'Trending Winners'
} as const

export const TrendingScreen = () => {
  useAppTabScreen()
  const dispatch = useDispatch()
  const category = useSelector(getTrendingCategory) ?? 'tracks'
  const { isEnabled: isTrendingWinnersEnabled } = useFeatureFlag(
    FeatureFlags.TRENDING_WINNERS
  )
  const effectiveCategory =
    !isTrendingWinnersEnabled && category === 'winners' ? 'tracks' : category

  const [winnersWeek, setWinnersWeek] = useState<string | null>(null)
  const [winnersSubFilter, setWinnersSubFilter] = useState<
    'tracks' | 'underground'
  >('tracks')

  useEffect(() => {
    if (!isTrendingWinnersEnabled && category === 'winners') {
      dispatch(setTrendingCategory('tracks'))
    }
  }, [category, dispatch, isTrendingWinnersEnabled])

  return (
    <Screen
      url='Trending'
      header={() => (
        <MobileRootHeader
          title={titleByCategory[effectiveCategory]}
          showDivider={false}
        >
          {effectiveCategory === 'tracks' ? <TrendingFilterButton /> : null}
        </MobileRootHeader>
      )}
    >
      <Flex flex={1} column style={{ minHeight: 0 }}>
        <ScreenPrimaryContent>
          <TrendingHeader
            title={titleByCategory[effectiveCategory]}
            icon={IconTrending}
            filterModal={TRENDING_FILTER_MODAL}
            showTitleRow={false}
          />
        </ScreenPrimaryContent>
        <ScreenContent>
          {effectiveCategory === 'tracks' ? (
            <ScreenSecondaryContent>
              <TrendingTracksLineup header={<TrendingFilterChips />} />
            </ScreenSecondaryContent>
          ) : effectiveCategory === 'underground' ? (
            <ScreenSecondaryContent>
              <TrendingUndergroundLineup />
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
