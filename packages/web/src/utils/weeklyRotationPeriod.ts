/**
 * The Weekly Rotation period, as the API defines it: identified by an ISO
 * (year, week) pair but rolling over on Wednesday 00:00 UTC rather than
 * Monday. Mirrors `weeklyRotationPeriod` in the api repo.
 *
 * Pure and dependency-free on purpose: the SSR bundle imports it, and SSR
 * avoids `@audius/common/utils` because that drags in dayjs and friends.
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

const OG_BASE_URL = 'https://og.audius.co'

/**
 * The OG card for a listener's current mix. The period is a cache-buster:
 * scrapers key their caches on the URL, and the same handle means a new
 * card once the week rolls over.
 */
export const getWeeklyRotationOgImageUrl = (
  handle: string,
  date: Date = new Date()
) =>
  `${OG_BASE_URL}/weekly-rotation/${encodeURIComponent(
    handle
  )}?week=${formatWeeklyRotationPeriod(getWeeklyRotationPeriod(date))}`
