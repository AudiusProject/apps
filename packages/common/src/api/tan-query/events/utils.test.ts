import { describe, expect, it } from 'vitest'

import { dedupeContestTrackIds } from './utils'

describe('dedupeContestTrackIds', () => {
  it('keeps the first occurrence of each track id in order', () => {
    expect(dedupeContestTrackIds([1, 2, 1, 3, 2, 4])).toEqual([1, 2, 3, 4])
  })

  it('dedupes track ids that repeat across paginated results', () => {
    const firstPage = [10, 11, 12]
    const secondPage = [12, 13, 10]

    expect(dedupeContestTrackIds([...firstPage, ...secondPage])).toEqual([
      10, 11, 12, 13
    ])
  })
})
