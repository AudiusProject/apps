import { describe, expect, it } from 'vitest'

import { isDateOnOrBeforeToday } from './datePickerUtils'

describe('Advanced release date calendar', () => {
  it.each([
    [2026, 9, 19],
    [2026, 9, 31],
    [2026, 11, 31],
    [2026, 2, 8], // Daylight saving begins in Los Angeles.
    [2026, 10, 1] // Daylight saving ends in Los Angeles.
  ])('allows today and earlier but rejects tomorrow (%i-%i-%i)', (y, m, d) => {
    for (const hour of [0, 12, 23]) {
      const now = new Date(y, m, d, hour, 30)
      expect(isDateOnOrBeforeToday(new Date(y, m, d - 1), now)).toBe(true)
      expect(isDateOnOrBeforeToday(new Date(y, m, d, 23, 59), now)).toBe(true)
      expect(isDateOnOrBeforeToday(new Date(y, m, d + 1), now)).toBe(false)
      expect(isDateOnOrBeforeToday(new Date(y, m, d + 7), now)).toBe(false)
    }
  })
})
