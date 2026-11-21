import {
  formatWeeklyRotationPeriod,
  getWeeklyRotationPeriod
} from '@audius/common/src/utils/weeklyRotation'

const OG_BASE_URL = 'https://og.audius.co'

export const getWeeklyRotationOgImageUrl = (
  handle: string,
  date: Date = new Date()
) =>
  `${OG_BASE_URL}/weekly-rotation/${encodeURIComponent(
    handle
  )}?week=${formatWeeklyRotationPeriod(getWeeklyRotationPeriod(date))}`
