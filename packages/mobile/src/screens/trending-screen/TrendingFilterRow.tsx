import { useCallback } from 'react'

import { TimeRange } from '@audius/common/models'
import { modalsActions, trendingPageSelectors } from '@audius/common/store'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Flex } from '@audius/harmony-native'
import { TrendingDropdownButton } from 'app/components/trending-dropdown-button'
import { makeStyles } from 'app/styles'

import { TrendingGenrePill } from './TrendingGenrePill'
import { TRENDING_TIME_RANGE_MODAL } from './TrendingTimeRangeDrawer'

const { getTrendingTimeRange } = trendingPageSelectors
const { setVisibility } = modalsActions

const timeRangeLabels: Record<TimeRange, string> = {
  [TimeRange.WEEK]: 'This Week',
  [TimeRange.MONTH]: 'This Month',
  [TimeRange.ALL_TIME]: 'All Time'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    gap: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight8,
    backgroundColor: palette.white
  }
}))

export const TrendingFilterRow = () => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const timeRange = useSelector(getTrendingTimeRange) ?? TimeRange.WEEK

  const handleOpenTimeRangeDrawer = useCallback(() => {
    dispatch(setVisibility({ modal: TRENDING_TIME_RANGE_MODAL, visible: true }))
  }, [dispatch])

  return (
    <View style={styles.row}>
      <Flex gap='s' direction='row' alignItems='center' flex={1}>
        <TrendingDropdownButton
          label={timeRangeLabels[timeRange]}
          onPress={handleOpenTimeRangeDrawer}
        />
        <TrendingGenrePill />
      </Flex>
    </View>
  )
}
