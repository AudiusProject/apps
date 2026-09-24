import { describe, expect, it } from 'vitest'

import { getWeeklyRotationOgImageUrl } from './weeklyRotationPeriod'

const utc = (y: number, m: number, d: number, h = 0) =>
  new Date(Date.UTC(y, m - 1, d, h))

describe('getWeeklyRotationOgImageUrl', () => {
  it('stamps the period into the card URL', () => {
    expect(getWeeklyRotationOgImageUrl('dylan', utc(2026, 9, 9))).toBe(
      'https://og.audius.co/weekly-rotation/dylan?week=2026-37'
    )
  })

  it('encodes the handle', () => {
    expect(getWeeklyRotationOgImageUrl('a b', utc(2026, 9, 9))).toBe(
      'https://og.audius.co/weekly-rotation/a%20b?week=2026-37'
    )
  })
})
