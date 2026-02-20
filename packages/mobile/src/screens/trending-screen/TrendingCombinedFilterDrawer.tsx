import { useCallback } from 'react'

import { TimeRange } from '@audius/common/models'
import {
  modalsActions,
  trendingPageActions,
  trendingPageLineupActions,
  trendingPageSelectors as trendingSelectors
} from '@audius/common/store'
import { ALL_GENRES } from '@audius/common/utils'
import { Pressable, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Button, Flex, IconCaretRight, Text } from '@audius/harmony-native'
import {
  RadioButton,
  SelectedValue,
  Text as CoreText
} from 'app/components/core'
import { AppDrawer, useDrawerState } from 'app/components/drawer'
import { makeStyles } from 'app/styles'

import { MODAL_NAME as TRENDING_GENRE_MODAL } from './TrendingFilterDrawer'

export const TRENDING_FILTER_MODAL = 'TrendingFilter' as const

const timeRangeLabels: Record<TimeRange, string> = {
  [TimeRange.WEEK]: 'This Week',
  [TimeRange.MONTH]: 'Past Month',
  [TimeRange.ALL_TIME]: 'All Time'
}

const timeRangeOptions: TimeRange[] = [
  TimeRange.WEEK,
  TimeRange.MONTH,
  TimeRange.ALL_TIME
]

const messages = {
  title: 'Trending',
  timeRangeSection: 'Time Range',
  filterByGenre: 'Filter by genre',
  selected: 'Selected',
  done: 'Done',
  clear: 'Clear'
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  content: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(6)
  },
  timeRangeSectionTitle: {
    marginTop: spacing(4),
    marginBottom: spacing(2)
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight8
  },
  filterSection: {
    marginTop: spacing(6),
    marginBottom: spacing(2)
  },
  filterSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing(2)
  },
  filterValueContainer: {
    marginTop: spacing(3),
    marginHorizontal: spacing(2)
  },
  valuePillWrapper: {
    alignSelf: 'flex-start'
  }
}))

export const TrendingCombinedFilterDrawer = () => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const timeRange =
    useSelector(trendingSelectors.getTrendingTimeRange) ?? TimeRange.WEEK
  const genre = useSelector(trendingSelectors.getTrendingGenre) ?? ALL_GENRES

  useDrawerState(TRENDING_FILTER_MODAL)
  const { trendingWeekActions, trendingMonthActions, trendingAllTimeActions } =
    trendingPageLineupActions

  const resetLineups = useCallback(() => {
    dispatch(trendingWeekActions.reset())
    dispatch(trendingMonthActions.reset())
    dispatch(trendingAllTimeActions.reset())
  }, [dispatch])

  const handleSelectTimeRange = useCallback(
    (range: TimeRange) => {
      dispatch(trendingPageActions.setTrendingTimeRange(range))
      resetLineups()
    },
    [dispatch, resetLineups]
  )

  const handleOpenGenrePicker = useCallback(() => {
    dispatch(
      modalsActions.setVisibility({
        modal: TRENDING_FILTER_MODAL,
        visible: false
      })
    )
    dispatch(
      modalsActions.setVisibility({
        modal: TRENDING_GENRE_MODAL,
        visible: true
      })
    )
  }, [dispatch])

  const handleDone = useCallback(() => {
    dispatch(
      modalsActions.setVisibility({
        modal: TRENDING_FILTER_MODAL,
        visible: false
      })
    )
  }, [dispatch])

  const handleClear = useCallback(() => {
    dispatch(trendingPageActions.setTrendingTimeRange(TimeRange.WEEK))
    dispatch(trendingPageActions.setTrendingGenre(null))
    resetLineups()
    dispatch(
      modalsActions.setVisibility({
        modal: TRENDING_FILTER_MODAL,
        visible: false
      })
    )
  }, [dispatch, resetLineups])

  return (
    <AppDrawer
      modalName={TRENDING_FILTER_MODAL}
      title={messages.title}
      isGestureSupported
    >
      <View style={styles.content}>
        <View style={styles.timeRangeSectionTitle}>
          <CoreText fontSize='large' weight='demiBold'>
            {messages.timeRangeSection}
          </CoreText>
        </View>
        {timeRangeOptions.map((range) => (
          <Pressable
            key={range}
            onPress={() => handleSelectTimeRange(range)}
            style={styles.timeRangeRow}
          >
            <Flex direction='row' alignItems='center' gap='m'>
              <RadioButton checked={timeRange === range} />
              <Text
                variant='body'
                size='l'
                color={timeRange === range ? 'accent' : 'default'}
              >
                {timeRangeLabels[range]}
              </Text>
            </Flex>
            {timeRange === range ? (
              <Text variant='body' size='s' color='accent'>
                {messages.selected}
              </Text>
            ) : null}
          </Pressable>
        ))}

        <Pressable onPress={handleOpenGenrePicker} style={styles.filterSection}>
          <View style={styles.filterSelectRow}>
            <CoreText fontSize='large' weight='demiBold'>
              {messages.filterByGenre}
            </CoreText>
            <IconCaretRight color='subdued' size='s' />
          </View>
          <View style={[styles.filterValueContainer, styles.valuePillWrapper]}>
            <SelectedValue>
              <CoreText fontSize='small' weight='demiBold'>
                {genre}
              </CoreText>
            </SelectedValue>
          </View>
        </Pressable>

        <Flex direction='row' gap='m' mt='2xl'>
          <Button variant='primary' fullWidth onPress={handleDone}>
            {messages.done}
          </Button>
          <Button variant='secondary' fullWidth onPress={handleClear}>
            {messages.clear}
          </Button>
        </Flex>
      </View>
    </AppDrawer>
  )
}
