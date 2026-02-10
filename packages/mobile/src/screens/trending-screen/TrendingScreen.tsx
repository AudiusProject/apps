import { useCallback } from 'react'

import { modalsActions, trendingPageSelectors } from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { IconTrending } from '@audius/harmony-native'
import { Screen, ScreenContent, ScreenHeader } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { TrendingDropdownButton } from 'app/components/trending-dropdown-button'
import { useAppTabScreen } from 'app/hooks/useAppTabScreen'

import { TRENDING_CATEGORY_MODAL } from './TrendingCategoryDrawer'
import { TrendingFilterRow } from './TrendingFilterRow'
import { TrendingTracksLineup } from './TrendingTracksLineup'
import { TrendingUndergroundLineup } from './TrendingUndergroundLineup'

const { getTrendingCategory } = trendingPageSelectors
const { setVisibility } = modalsActions

const categoryLabels = {
  tracks: 'Tracks',
  underground: 'Underground'
} as const

export const TrendingScreen = () => {
  useAppTabScreen()
  const dispatch = useDispatch()
  const category = useSelector(getTrendingCategory) ?? 'tracks'

  const handleOpenCategoryDrawer = useCallback(() => {
    dispatch(setVisibility({ modal: TRENDING_CATEGORY_MODAL, visible: true }))
  }, [dispatch])

  return (
    <Screen url='Trending'>
      <ScreenPrimaryContent>
        <ScreenHeader text='Trending' icon={IconTrending}>
          <TrendingDropdownButton
            label={categoryLabels[category]}
            onPress={handleOpenCategoryDrawer}
          />
        </ScreenHeader>
      </ScreenPrimaryContent>
      <ScreenContent>
        {category === 'tracks' ? (
          <>
            <TrendingFilterRow />
            <ScreenSecondaryContent>
              <TrendingTracksLineup />
            </ScreenSecondaryContent>
          </>
        ) : (
          <ScreenSecondaryContent>
            <TrendingUndergroundLineup />
          </ScreenSecondaryContent>
        )}
      </ScreenContent>
    </Screen>
  )
}
