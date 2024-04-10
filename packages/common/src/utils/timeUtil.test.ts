import { describe, test, expect } from 'vitest'

import dayjs from './dayjs'
import {
  formatSeconds,
  formatSecondsAsText,
  formatLineupTileDuration,
  formatDate,
  utcToLocalTime,
  getLocalTimezone,
  formatDateWithTimezoneOffset
} from './timeUtil'

describe('formatSeconds', () => {
  test('should correctly format seconds less than an hour', () => {
    expect(formatSeconds(90)).toBe('1:30')
  })

  test('should correctly format seconds more than an hour', () => {
    expect(formatSeconds(3661)).toBe('1:01:01')
  })
})

describe('formatSecondsAsText', () => {
  test('should correctly format seconds less than an hour', () => {
    expect(formatSecondsAsText(90)).toBe('1m 30s')
  })

  test('should correctly format seconds more than an hour', () => {
    expect(formatSecondsAsText(3661)).toBe('1h 1m')
  })
})

describe('formatLineupTileDuration', () => {
  test('should format correctly for short content less than an hour', () => {
    expect(formatLineupTileDuration(90, false)).toBe('1:30')
  })

  test('should format correctly for long content more than an hour', () => {
    expect(formatLineupTileDuration(3661, true)).toBe('1hr 2m')
  })
})

describe('formatDate', () => {
  test('should format date correctly', () => {
    expect(formatDate('2023-12-17')).toBe('12/17/23')
  })
})

describe('formatDateWithTimezoneOffset', () => {
  test('should format date correctly with mocked timezone offset', () => {
    const offsetFormattedDate = formatDateWithTimezoneOffset(
      '2023-12-17T12:00:00Z'
    )
    const expectedDate = '12/17/23'
    expect(offsetFormattedDate).toBe(expectedDate)
  })
})

describe('utcToLocalTime', () => {
  test('should convert UTC to local time', () => {
    const localTime = utcToLocalTime('2023-12-17T12:00:00Z')
    expect(localTime.isValid()).toBe(true)
  })
})

describe('getLocalTimezone', () => {
  test('should return the local timezone', () => {
    const timezone = getLocalTimezone()
    expect(timezone).toBe(dayjs().format('z'))
  })
})
