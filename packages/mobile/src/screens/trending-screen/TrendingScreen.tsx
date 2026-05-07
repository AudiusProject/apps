import { useCallback, useState } from 'react'

import { trendingPageSelectors } from '@audius/common/store'
import { useSelector } from 'react-redux'

import { Flex, IconTrending } from '@audius/harmony-native'
import { Screen, ScreenContent } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { MobileRootHeader } from 'app/screens/app-screen/MobileRootHeader'

import { TRENDING_FILTER_MODAL } from './TrendingCombinedFilterDrawer'
import { TrendingFilterButton } from './TrendingFilterButton'
import { TrendingFilterChips } from './TrendingFilterChips'
import { TrendingHeader } from './TrendingHeader'
import { TrendingLineupSkeletons } from './TrendingLineupSkeletons'
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
  const category = useSelector(getTrendingCategory) ?? 'tracks'

  const [winnersWeek, setWinnersWeek] = useState<string | null>(null)
  const [winnersSubFilter, setWinnersSubFilter] = useState<
    'tracks' | 'underground'
  >('tracks')

  // Memoized so the header isn't a new function reference on every render —
  // otherwise Screen's setOptions runs each parent re-render and React
  // Navigation rebuilds the header, remounting AccountPictureHeader and
  // re-firing the profile-picture image-fetch path.
  const renderHeader = useCallback(
    () => (
      <MobileRootHeader title={titleByCategory[category]} showDivider={false}>
        {category === 'tracks' ? <TrendingFilterButton /> : null}
      </MobileRootHeader>
    ),
    [category]
  )

  // Render the category pills both as the deferred-render skeleton and as
  // the children. Same JSX in the same position → React reconciles to the
  // same TrendingHeader instance across the swap, so the pills appear
  // immediately and don't pop in / shift content when isScreenReady flips.
  const trendingPills = (
    <TrendingHeader
      title={titleByCategory[category]}
      icon={IconTrending}
      filterModal={TRENDING_FILTER_MODAL}
      showTitleRow={false}
    />
  )

  return (
    <Screen url='Trending' header={renderHeader}>
      <Flex flex={1} direction='column' style={{ minHeight: 0 }}>
        <ScreenPrimaryContent skeleton={trendingPills}>
          {trendingPills}
        </ScreenPrimaryContent>
        <ScreenContent>
          {category === 'tracks' ? (
            <ScreenSecondaryContent skeleton={<TrendingLineupSkeletons />}>
              <TrendingTracksLineup header={<TrendingFilterChips />} />
            </ScreenSecondaryContent>
          ) : category === 'underground' ? (
            <ScreenSecondaryContent skeleton={<TrendingLineupSkeletons />}>
              <TrendingUndergroundLineup />
            </ScreenSecondaryContent>
          ) : (
            <ScreenSecondaryContent skeleton={<TrendingLineupSkeletons />}>
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
