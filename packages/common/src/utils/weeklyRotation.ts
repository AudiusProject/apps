/**
 * The Weekly Rotation period, as the API defines it: identified by an ISO
 * (year, week) pair but rolling over on Wednesday 00:00 UTC rather than
 * Monday. Mirrors `weeklyrotation.Period` in the api repo
 * (weeklyrotation/period.go).
 *
 * Kept dependency-free because the web SSR bundle imports it.
 */

const ROLLOVER_OFFSET_DAYS = 2 // ISO Monday -> Wednesday
const MS_PER_DAY = 86_400_000

export type WeeklyRotationPeriod = { year: number; week: number }

export const getWeeklyRotationPeriod = (
  date: Date = new Date()
): WeeklyRotationPeriod => {
  // Shift back so a period that started on Wednesday maps onto the ISO week
  // whose Monday it belongs to, then do the standard ISO week calculation:
  // the ISO week of a date is the week of that date's Thursday.
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

/** `2026-37`: stable, sortable, safe in a query string. */
export const formatWeeklyRotationPeriod = ({
  year,
  week
}: WeeklyRotationPeriod) => `${year}-${String(week).padStart(2, '0')}`

const WEEKLY_ROTATION_QUEUE_SOURCE = 'WEEKLY_ROTATION_TRACKS'

/**
 * Playback queue source for a user's mix. Per owner so your own mix and a
 * shared one don't share play state.
 */
export const getWeeklyRotationQueueSource = (
  ownerUserId: number | null | undefined
) => `${WEEKLY_ROTATION_QUEUE_SOURCE}:${ownerUserId ?? ''}`

/** The mix owner's id if `source` is a Weekly Rotation queue source. */
export const getWeeklyRotationOwnerIdFromQueueSource = (
  source: string | null | undefined
): number | null => {
  const prefix = `${WEEKLY_ROTATION_QUEUE_SOURCE}:`
  if (!source?.startsWith(prefix)) return null
  const ownerUserId = Number(source.slice(prefix.length))
  return Number.isInteger(ownerUserId) && ownerUserId > 0 ? ownerUserId : null
}
