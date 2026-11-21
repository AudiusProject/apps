const ROLLOVER_OFFSET_DAYS = 2
const MS_PER_DAY = 86_400_000

export type WeeklyRotationPeriod = { year: number; week: number }

export const getWeeklyRotationPeriod = (
  date: Date = new Date()
): WeeklyRotationPeriod => {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  d.setUTCDate(d.getUTCDate() - ROLLOVER_OFFSET_DAYS)
  const isoWeekday = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - isoWeekday)
  const year = d.getUTCFullYear()
  const yearStart = Date.UTC(year, 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart) / MS_PER_DAY + 1) / 7)
  return { year, week }
}

export const formatWeeklyRotationPeriod = ({
  year,
  week
}: WeeklyRotationPeriod) => `${year}-${String(week).padStart(2, '0')}`

const WEEKLY_ROTATION_QUEUE_SOURCE = 'WEEKLY_ROTATION_TRACKS'

export const getWeeklyRotationQueueSource = (
  ownerUserId: number | null | undefined
) => `${WEEKLY_ROTATION_QUEUE_SOURCE}:${ownerUserId ?? ''}`

export const getWeeklyRotationOwnerIdFromQueueSource = (
  source: string | null | undefined
): number | null => {
  const prefix = `${WEEKLY_ROTATION_QUEUE_SOURCE}:`
  if (!source?.startsWith(prefix)) return null
  const ownerUserId = Number(source.slice(prefix.length))
  return Number.isInteger(ownerUserId) && ownerUserId > 0 ? ownerUserId : null
}
