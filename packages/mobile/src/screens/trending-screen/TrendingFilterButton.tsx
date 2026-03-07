import { TimeRange } from '@audius/common/models'
import { modalsActions, trendingPageSelectors } from '@audius/common/store'
import { ALL_GENRES } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, IconLeading, SelectablePill } from '@audius/harmony-native'

import { TRENDING_FILTER_MODAL } from './TrendingCombinedFilterDrawer'

export const TrendingFilterButton = () => {
  const dispatch = useDispatch()
  const timeRange = useSelector(trendingPageSelectors.getTrendingTimeRange)
  const genre = useSelector(trendingPageSelectors.getTrendingGenre)

  const hasActiveFilters =
    (timeRange ?? TimeRange.WEEK) !== TimeRange.WEEK ||
    (genre ?? ALL_GENRES) !== ALL_GENRES

  const handleOpenFilter = () => {
    dispatch(
      modalsActions.setVisibility({
        modal: TRENDING_FILTER_MODAL,
        visible: true
      })
    )
  }

  return (
    <Flex>
      <SelectablePill
        type='button'
        icon={IconLeading}
        size='large'
        isSelected={hasActiveFilters}
        isControlled
        onPress={handleOpenFilter}
        accessibilityLabel='Open filter'
      />
    </Flex>
  )
}
