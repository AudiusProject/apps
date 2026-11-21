import { visibilityMessages as messages } from '@audius/common/messages'
import { getLocalTimezone, type Nullable } from '@audius/common/utils'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import calendar from 'dayjs/plugin/calendar'

import { Flex, Hint, IconCalendarMonth } from '@audius/harmony-native'
import { DateTimeInput } from 'app/components/core'

dayjs.extend(calendar)

type ScheduledReleaseDateFieldProps = {
  releaseDate: Nullable<string>
  onChange: (date: string) => void
  dateError?: string
  dateTimeError?: string
}

export const ScheduledReleaseDateField = (
  props: ScheduledReleaseDateFieldProps
) => {
  const { releaseDate, onChange, dateError, dateTimeError } = props

  const handleDateChange = (date: string) => {
    const newDate = dayjs(date)

    let updatedDate: Dayjs
    if (dayjs().isSame(newDate, 'day')) {
      updatedDate = newDate.set('hour', 23).set('minute', 59)
    } else {
      const currentDate = dayjs(releaseDate)
      updatedDate = newDate
        .hour(currentDate.isValid() ? currentDate.hour() : 0)
        .minute(currentDate.isValid() ? currentDate.minute() : 0)
    }

    onChange(updatedDate.toString())
  }

  const handleTimeChange = (time: string) => {
    const updatedDate = dayjs(releaseDate)
      .hour(dayjs(time).hour())
      .minute(dayjs(time).minute())
      .toString()
    onChange(updatedDate)
  }

  return (
    <Flex direction='column' gap='l'>
      <Flex gap='l'>
        <Flex gap='l'>
          <DateTimeInput
            mode='date'
            date={releaseDate ?? undefined}
            onChange={handleDateChange}
            formatDate={(date) =>
              dayjs(date).calendar(null, {
                sameDay: '[Today]',
                nextDay: '[Tomorrow]',
                nextWeek: 'dddd',
                lastDay: '[Yesterday]',
                lastWeek: '[Last] dddd',
                sameElse: 'M/D/YY'
              })
            }
            inputProps={{
              label: messages.dateLabel,
              startIcon: IconCalendarMonth,
              error: !!dateError,
              helperText: dateError
            }}
            dateTimeProps={{
              minimumDate: dayjs().toDate()
            }}
          />
          <DateTimeInput
            mode='time'
            date={releaseDate ?? undefined}
            onChange={handleTimeChange}
            inputProps={{
              label: messages.timeLabel,
              error: !!dateTimeError,
              helperText: dateTimeError
            }}
          />
        </Flex>
      </Flex>
      {releaseDate ? (
        <Hint>{messages.futureReleaseHint(getLocalTimezone())}</Hint>
      ) : null}
    </Flex>
  )
}
