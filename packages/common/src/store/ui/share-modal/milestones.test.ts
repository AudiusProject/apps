import { describe, expect, it } from 'vitest'

import { getFeaturedPlaylistName, isShareCardPlayMilestone } from './milestones'

describe('isShareCardPlayMilestone', () => {
  it.each([1000, 5000, 10000, 50000, 100000, 500000, 1000000])(
    'offers a card at %i plays',
    (threshold) => {
      expect(isShareCardPlayMilestone(threshold)).toBe(true)
    }
  )

  // The other thresholds the play trigger mints notifications for
  it.each([10, 25, 50, 100, 250, 500, 2500, 25000, 250000])(
    'does not offer a card at %i plays',
    (threshold) => {
      expect(isShareCardPlayMilestone(threshold)).toBe(false)
    }
  )
})

describe('getFeaturedPlaylistName', () => {
  it('names the editorial playlists', () => {
    expect(getFeaturedPlaylistName(4281)).toBe('Hot & New')
    expect(getFeaturedPlaylistName(1795117483)).toBe('All Things Bass')
  })

  it('ignores any other playlist', () => {
    expect(getFeaturedPlaylistName(55)).toBeUndefined()
  })
})
