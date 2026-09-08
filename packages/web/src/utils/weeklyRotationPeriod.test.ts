import { describe, expect, it } from 'vitest'

import {
  formatWeeklyRotationPeriod,
  getWeeklyRotationOgImageUrl,
  getWeeklyRotationPeriod
} from './weeklyRotationPeriod'

const utc = (y: number, m: number, d: number, h = 0) =>
  new Date(Date.UTC(y, m - 1, d, h))

// The same cases as TestWeeklyRotationPeriod in the api repo, so the two
// implementations can't drift apart without one of these failing.
describe('getWeeklyRotationPeriod', () => {
  it('opens ISO week 37 at the Wednesday rollover', () => {
    // 2026-09-09 is a Wednesday.
    expect(getWeeklyRotationPeriod(utc(2026, 9, 9))).toEqual({
      year: 2026,
      week: 37
    })
  })

  it('keeps Monday and Tuesday in the period that started the previous Wednesday', () => {
    expect(getWeeklyRotationPeriod(utc(2026, 9, 7, 12))).toEqual({
      year: 2026,
      week: 36
    })
    expect(getWeeklyRotationPeriod(utc(2026, 9, 8, 23))).toEqual({
      year: 2026,
      week: 36
    })
  })

  it('works in UTC regardless of the caller timezone offset', () => {
    // 2026-09-08 20:00 PDT is 2026-09-09 03:00 UTC.
    expect(
      getWeeklyRotationPeriod(new Date('2026-09-08T20:00:00-07:00'))
    ).toEqual({ year: 2026, week: 37 })
  })

  it('handles the year boundary', () => {
    // ISO week 1 of 2027 starts Monday 2027-01-04, so its period starts
    // Wednesday 2027-01-06; the days before belong to 2026's week 53.
    expect(getWeeklyRotationPeriod(utc(2027, 1, 6))).toEqual({
      year: 2027,
      week: 1
    })
    expect(getWeeklyRotationPeriod(utc(2027, 1, 5, 23))).toEqual({
      year: 2026,
      week: 53
    })
  })
})

describe('formatWeeklyRotationPeriod', () => {
  it('zero-pads the week', () => {
    expect(formatWeeklyRotationPeriod({ year: 2027, week: 1 })).toBe('2027-01')
    expect(formatWeeklyRotationPeriod({ year: 2026, week: 37 })).toBe('2026-37')
  })
})

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
