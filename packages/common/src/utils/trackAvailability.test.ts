import { describe, it, expect } from 'vitest'

import { isTrackUnavailable } from './trackAvailability'

const track = {
  is_delete: false,
  is_streamable: false,
  owner_id: 1
}

describe('isTrackUnavailable', () => {
  it('is true for a non-streamable track', () => {
    expect(isTrackUnavailable(track)).toBe(true)
    expect(isTrackUnavailable(track, 2)).toBe(true)
  })

  it('is false when is_streamable is missing or true', () => {
    expect(isTrackUnavailable({ ...track, is_streamable: undefined })).toBe(
      false
    )
    expect(isTrackUnavailable({ ...track, is_streamable: true })).toBe(false)
  })

  it('is false for deleted tracks', () => {
    expect(isTrackUnavailable({ ...track, is_delete: true })).toBe(false)
  })

  it('is false for the owner', () => {
    expect(isTrackUnavailable(track, 1)).toBe(false)
  })
})
