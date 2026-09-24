import { describe, expect, it } from 'vitest'

import {
  formatWeeklyRotationPeriod,
  getWeeklyRotationOwnerIdFromQueueSource,
  getWeeklyRotationPeriod,
  getWeeklyRotationQueueSource
} from './weeklyRotation'

const utc = (y: number, m: number, d: number, h = 0) =>
  new Date(Date.UTC(y, m - 1, d, h))

// Same cases as TestPeriod in the api repo (weeklyrotation/period_test.go).
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

describe('weekly rotation queue source', () => {
  it('round-trips the owner id', () => {
    const source = getWeeklyRotationQueueSource(123)
    expect(source).toBe('WEEKLY_ROTATION_TRACKS:123')
    expect(getWeeklyRotationOwnerIdFromQueueSource(source)).toBe(123)
  })

  it('returns null for other sources and a missing owner', () => {
    expect(getWeeklyRotationOwnerIdFromQueueSource('trending-week')).toBeNull()
    expect(getWeeklyRotationOwnerIdFromQueueSource(null)).toBeNull()
    expect(
      getWeeklyRotationOwnerIdFromQueueSource(
        getWeeklyRotationQueueSource(undefined)
      )
    ).toBeNull()
  })
})
