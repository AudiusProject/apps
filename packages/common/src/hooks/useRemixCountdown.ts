import { useState, useEffect } from 'react'

import dayjs from '../utils/dayjs'

type TimeUnit = {
  value: number
  isSubdued: boolean
}

type TimeLeft = {
  days: TimeUnit
  hours: TimeUnit
  minutes: TimeUnit
  seconds: TimeUnit
} | null

export const useRemixCountdown = (endDate?: string): TimeLeft => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(null)

  useEffect(() => {
    if (!endDate) return

    const calculateTimeLeft = () => {
      const now = dayjs()
      const end = dayjs(endDate)

      if (end.isBefore(now)) {
        setTimeLeft(null)
        return
      }

      const totalDays = end.diff(now, 'days')
      const remainingTime = end.diff(now)
      const duration = dayjs.duration(remainingTime)

      const daysValue = totalDays
      const hoursValue = duration.hours()
      const minutesValue = duration.minutes()
      const secondsValue = duration.seconds()

      const isDaysSubdued = daysValue === 0
      const isHoursSubdued = isDaysSubdued && hoursValue === 0
      const isMinutesSubdued = isHoursSubdued && minutesValue === 0
      const isSecondsSubdued = isMinutesSubdued && secondsValue === 0

      setTimeLeft({
        days: {
          value: daysValue,
          isSubdued: isDaysSubdued
        },
        hours: {
          value: hoursValue,
          isSubdued: isHoursSubdued
        },
        minutes: {
          value: minutesValue,
          isSubdued: isMinutesSubdued
        },
        seconds: {
          value: secondsValue,
          isSubdued: isSecondsSubdued
        }
      })
    }

    calculateTimeLeft()

    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [endDate])

  return timeLeft
}
