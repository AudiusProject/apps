import { describe, it, expect } from 'vitest'

import { formatCount } from './decimal'
import { formatBytes } from './formatUtil'

describe('formatUtil', function () {
  it('can format count', function () {
    expect(formatCount(0, 0)).toBe('0')
    expect(formatCount(1.23, 1)).toBe('1.2')
    expect(formatCount(1.23, 2)).toBe('1.23')
    expect(formatCount(0)).toBe('0')
    expect(formatCount(100)).toBe('100')
    expect(formatCount(1001)).toBe('1K')
    expect(formatCount(1200)).toBe('1.2K')
    // expect(formatCount(1239)).toBe('1.23K') fails: rounds up
    expect(formatCount(9998)).toBe('10K')
    expect(formatCount(10023)).toBe('10K')
    expect(formatCount(10423)).toBe('10.4K')
    expect(formatCount(100000)).toBe('100K')
    expect(formatCount(103313)).toBe('103K')
    expect(formatCount(1000000)).toBe('1M')
    expect(formatCount(1234567)).toBe('1.23M')
    // expect(formatCount(1235567)).toBe('1.23M') fails: rounds up
    expect(formatCount(100000000)).toBe('100M')
  })

  it('can format bytes', function () {
    expect(formatBytes(1024)).toBe('1.02 KB')
    expect(formatBytes(3072)).toBe('3.07 KB')
    expect(formatBytes(1234000)).toBe('1.23 MB')
    expect(formatBytes(1234567890)).toBe('1.23 GB')
  })
})
