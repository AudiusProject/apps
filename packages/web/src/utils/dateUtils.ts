import { dayjs } from '@audius/common/utils'
import { Nullable } from 'vitest'

export const formatToday = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const day = today.getDate()
  return `${year}-${month}-${day}`
}

const formatReleaseMessage = (
  releaseDate: string,
  dayLabel: string,
  includeTimeAndTz: boolean
) => {
  if (!includeTimeAndTz) return dayLabel
  const parsed = dayjs(releaseDate ?? undefined)
  const timePart = parsed.format('hA')
  const tzPart = getLocalTimezone()
  return `${dayLabel} @ ${timePart} ${tzPart}`
}

export const formatCalendarTime = (
  time: Nullable<string>,
  _prefixMessage?: string
) => {
  if (!time) {
    return 'Today'
  }

  const parsed = dayjs(time)
  const isFuture = parsed.isAfter(dayjs())

  const dayLabel = parsed.calendar(undefined, {
    sameDay: '[Today]',
    nextDay: '[Tomorrow]',
    nextWeek: 'dddd',
    lastDay: '[Yesterday]',
    lastWeek: '[Last] dddd',
    sameElse: 'M/D/YYYY'
  })

  return formatReleaseMessage(time, dayLabel, isFuture)
}

// DayJs Utils
export const getLocalTimezone = () => {
  return dayjs().format('z')
}
