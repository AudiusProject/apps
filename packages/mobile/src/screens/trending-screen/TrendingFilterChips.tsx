import { useCallback } from 'react'

import { TimeRange } from '@audius/common/models'
import {
  trendingPageActions,
  trendingPageLineupActions,
  trendingPageSelectors
} from '@audius/common/store'
import { ALL_GENRES } from '@audius/common/utils'
import { ScrollView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, IconCloseAlt, SelectablePill } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'

const { getTrendingTimeRange, getTrendingGenre, getTrendingCategory } =
  trendingPageSelectors
const { setTrendingTimeRange, setTrendingGenre } = trendingPageActions
const { trendingWeekActions, trendingMonthActions, trendingAllTimeActions } =
  trendingPageLineupActions

const timeRangeLabels: Record<TimeRange, string> = {
  [TimeRange.WEEK]: 'This Week',
  [TimeRange.MONTH]: 'Past Month',
  [TimeRange.ALL_TIME]: 'All Time'
}

const useStyles = makeStyles(({ spacing }) => ({
  contentContainer: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
    paddingBottom: 0,
    gap: spacing(2)
  }
}))

export const TrendingFilterChips = () => {
  const dispatch = useDispatch()
  const styles = useStyles()
  const category = useSelector(getTrendingCategory) ?? 'tracks'
  const timeRange = useSelector(getTrendingTimeRange) ?? TimeRange.WEEK
  const genre = useSelector(getTrendingGenre) ?? ALL_GENRES

  const resetLineups = useCallback(() => {
    dispatch(trendingWeekActions.reset())
    dispatch(trendingMonthActions.reset())
    dispatch(trendingAllTimeActions.reset())
  }, [dispatch])

  const handleClearTimeRange = useCallback(
    (_value: string, isSelected: boolean) => {
      if (!isSelected) {
        dispatch(setTrendingTimeRange(TimeRange.WEEK))
        resetLineups()
      }
    },
    [dispatch, resetLineups]
  )

  const handleClearGenre = useCallback(
    (_value: string, isSelected: boolean) => {
      if (!isSelected) {
        dispatch(setTrendingGenre(null))
        resetLineups()
      }
    },
    [dispatch, resetLineups]
  )

  const showTimeRangeChip = timeRange !== TimeRange.WEEK
  const showGenreChip = category === 'tracks' && genre !== ALL_GENRES

  if (!showTimeRangeChip && !showGenreChip) {
    return null
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <Flex direction='row' alignItems='center' gap='s'>
        {showTimeRangeChip ? (
          <SelectablePill
            type='radio'
            size='large'
            value={timeRange}
            label={timeRangeLabels[timeRange]}
            isSelected
            onChange={handleClearTimeRange}
            icon={IconCloseAlt}
            disableUnselectAnimation
          />
        ) : null}
        {showGenreChip ? (
          <SelectablePill
            type='radio'
            size='large'
            value={genre}
            label={genre}
            isSelected
            onChange={handleClearGenre}
            icon={IconCloseAlt}
            disableUnselectAnimation
          />
        ) : null}
      </Flex>
    </ScrollView>
  )
}
