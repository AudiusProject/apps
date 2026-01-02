import { dayjs } from '@audius/common/utils'
import { groupBy } from 'lodash'

import type { LineupItem } from './types'

const NOW = dayjs()
const START_OF_DAY = dayjs(NOW).startOf('day')
const START_OF_YESTERDAY = dayjs(NOW).subtract(1, 'day').startOf('day')
const START_OF_WEEK = dayjs(NOW).startOf('week')
const START_OF_LAST_WEEK = dayjs(NOW).subtract(1, 'week').startOf('week')
const START_OF_MONTH = dayjs(NOW).startOf('month')

const Delineations = Object.freeze({
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  EARLIER_THIS_WEEK: 'earlier this week',
  LAST_WEEK: 'last week',
  EARLIER_THIS_MONTH: 'earlier this month'
})

const getLineupItemGroup = ({ activityTimestamp }: LineupItem) => {
  const time = dayjs(activityTimestamp)
  if (time.isAfter(START_OF_DAY)) {
    return Delineations.TODAY
  }
  if (time.isAfter(START_OF_YESTERDAY)) {
    return Delineations.YESTERDAY
  }
  if (time.isAfter(START_OF_WEEK)) {
    return Delineations.EARLIER_THIS_WEEK
  }
  if (time.isAfter(START_OF_LAST_WEEK)) {
    return Delineations.LAST_WEEK
  }
  if (time.isAfter(START_OF_MONTH)) {
    return Delineations.EARLIER_THIS_MONTH
  }

  const startOfMonth = dayjs(time).startOf('month')
  if (startOfMonth.year() === NOW.year()) {
    return startOfMonth.format('MMMM')
  }
  return startOfMonth.format('MMMM YYYY')
}

export const delineateByTime = (entries: LineupItem[]) => {
  return Object.entries(groupBy<LineupItem>(entries, getLineupItemGroup)).map(
    ([title, data], index) => {
      // For the first group, prevent delineator from being displayed
      return index === 0
        ? { delineate: false, data }
        : { delineate: true, title, data }
    }
  )
}
