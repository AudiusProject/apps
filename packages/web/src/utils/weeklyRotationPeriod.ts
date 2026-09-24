// Imported by path rather than `@audius/common/utils` so the SSR bundle
// doesn't pull in the rest of common.
import {
  formatWeeklyRotationPeriod,
  getWeeklyRotationPeriod
} from '@audius/common/src/utils/weeklyRotation'

const OG_BASE_URL = 'https://og.audius.co'

/**
 * OG card URL for a user's current mix. The period param busts scraper caches
 * each week.
 */
export const getWeeklyRotationOgImageUrl = (
  handle: string,
  date: Date = new Date()
) =>
  `${OG_BASE_URL}/weekly-rotation/${encodeURIComponent(
    handle
  )}?week=${formatWeeklyRotationPeriod(getWeeklyRotationPeriod(date))}`
