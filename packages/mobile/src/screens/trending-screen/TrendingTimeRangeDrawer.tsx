import { useCallback } from 'react'

import { TimeRange } from '@audius/common/models'
import { modalsActions, trendingPageActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import ActionDrawer from 'app/components/action-drawer/ActionDrawer'

export const TRENDING_TIME_RANGE_MODAL = 'TrendingTimeRange' as const

const messages = {
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  allTime: 'All Time'
}

export const TrendingTimeRangeDrawer = () => {
  const dispatch = useDispatch()

  const handleSelect = useCallback(
    (timeRange: TimeRange) => () => {
      dispatch(
        modalsActions.setVisibility({
          modal: TRENDING_TIME_RANGE_MODAL,
          visible: false
        })
      )
      dispatch(trendingPageActions.setTrendingTimeRange(timeRange))
    },
    [dispatch]
  )

  const rows = [
    { text: messages.thisWeek, callback: handleSelect(TimeRange.WEEK) },
    { text: messages.thisMonth, callback: handleSelect(TimeRange.MONTH) },
    { text: messages.allTime, callback: handleSelect(TimeRange.ALL_TIME) }
  ]

  return <ActionDrawer modalName={TRENDING_TIME_RANGE_MODAL} rows={rows} />
}
