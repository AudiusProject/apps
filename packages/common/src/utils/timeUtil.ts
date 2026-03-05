import dayjs from './dayjs'

export const MS_IN_S = 1000
export const S_IN_MIN = 60
export const MIN_IN_HR = 60
export const HR_IN_DAY = 24
export const DAY_IN_MONTH = 30
export const MONTH_IN_YEAR = 12
const SECONDS_PER_HOUR = S_IN_MIN * MIN_IN_HR

export type TimeUnit = 'm' | 'h' | 'd' | 'mo' | 'y'

const timeUnitMsMap: Record<TimeUnit, number> = {
  m: MS_IN_S * S_IN_MIN,
  h: MS_IN_S * S_IN_MIN * MIN_IN_HR,
  d: MS_IN_S * S_IN_MIN * MIN_IN_HR * HR_IN_DAY,
  mo: MS_IN_S * S_IN_MIN * MIN_IN_HR * HR_IN_DAY * DAY_IN_MONTH,
  y: MS_IN_S * S_IN_MIN * MIN_IN_HR * HR_IN_DAY * DAY_IN_MONTH * MONTH_IN_YEAR
} as const

export const getLargestTimeUnitText = (time: Date) => {
  const then = new Date(time).getTime()
  const now = Date.now()
  const diff = now - then
  let unit: TimeUnit | null = null

  // Iterate through all time units to determine the largest one
  Object.entries(timeUnitMsMap).forEach(([u, ms]) => {
    if (diff >= ms) {
      unit = u as TimeUnit
    }
  })

  return unit ? `${Math.floor(diff / timeUnitMsMap[unit])}${unit}` : 'just now'
}

export const formatDateWithTimezoneOffset = (date: string): string => {
  return dayjs.utc(date).local().format('M/D/YY')
}

export const formatSeconds = (seconds: number): string => {
  const time = dayjs.duration(seconds, 'seconds')
  if (seconds >= SECONDS_PER_HOUR) {
    return time.format('H:mm:ss')
  } else {
    return time.format('m:ss')
  }
}

export const formatSecondsAsText = (seconds: number): string => {
  const d = dayjs.duration(seconds, 'seconds')
  if (seconds >= SECONDS_PER_HOUR) {
    // Formatting for durations longer than an hour
    return `${d.hours()}h ${d.minutes()}m`
  } else {
    // Formatting for durations shorter than an hour
    return `${d.minutes()}m ${d.seconds()}s`
  }
}

export const formatLineupTileDuration = (
  seconds: number,
  isLongFormContent = false,
  isCollection = false
): string => {
  if (isCollection) {
    return formatSecondsAsText(seconds)
  }
  if (!isLongFormContent && seconds < SECONDS_PER_HOUR) {
    return formatSeconds(seconds)
  }

  const d = dayjs.duration(seconds, 'seconds')
  const hourText = d.hours() > 0 ? `${d.hours()}hr ` : ''
  // Ceiling the minute value
  const minuteText = `${
    d.seconds() > 0 && d.minutes() < 59 ? d.minutes() + 1 : d.minutes()
  }m`

  return `${hourText}${minuteText}`
}

export const formatDate = (date: string, format?: string): string => {
  const dayjsFormat = format || 'M/D/YY'
  return dayjs(date).format(dayjsFormat)
}

export const utcToLocalTime = (date: string) => {
  return dayjs.utc(date).local()
}

export const getLocalTimezone = () => {
  return dayjs().format('z')
}

export const timestampRegex = /(?:([0-9]?\d):)?([0-5]?\d):([0-5]\d)/gm

export const getDurationFromTimestampMatch = (match: RegExpMatchArray) => {
  const h = match[1] ? Number(match[1]) : 0
  const m = match[2] ? Number(match[2]) : 0
  const s = match[3] ? Number(match[3]) : 0
  return s + m * 60 + h * 60 * 60
}

export const formatContestDeadline = (
  deadline?: string,
  format: 'short' | 'long' | 'card' = 'short'
): string => {
  if (!deadline) return ''

  const date = dayjs(deadline)

  switch (format) {
    case 'long':
      return `${date.format('ddd. MMM D, YYYY')} at ${date.format('h:mm A')} ${getLocalTimezone()}`
    case 'card':
      return `${date.format('MM/DD/YY')} at ${date.format('h:mm A')}`
    case 'short':
    default:
      return `${date.format('MM/DD/YY')}`
  }
}

export const formatContestDeadlineWithStatus = (
  deadline?: string,
  isEnded: boolean = false
): string => {
  if (!deadline) return ''

  const date = dayjs(deadline)
  const status = isEnded ? 'Ended' : 'Deadline'

  return `${status}: ${date.format('MM/DD/YY')}`
}
