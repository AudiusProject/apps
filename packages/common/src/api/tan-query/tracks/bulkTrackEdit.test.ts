import { describe, expect, it } from 'vitest'

import { Track } from '~/models/Track'

import {
  BULK_EDIT_MAX_TAGS,
  getBulkTrackEditChanges,
  hasBulkTrackEdit
} from './bulkTrackEdit'

const makeTrack = (overrides: Partial<Track> = {}) =>
  ({
    genre: 'Electronic',
    mood: null,
    tags: null,
    remix_of: null,
    is_stream_gated: false,
    stream_conditions: null,
    preview_start_seconds: null,
    ...overrides
  }) as Track

const premium = (price: number, albumTrackPrice?: number) => ({
  usdc_purchase: {
    price,
    ...(albumTrackPrice != null && { albumTrackPrice }),
    splits: [{ user_id: 1, percentage: 100 }]
  }
})

describe('getBulkTrackEditChanges', () => {
  it('returns nothing for an empty edit', () => {
    expect(getBulkTrackEditChanges(makeTrack(), {})).toEqual({ changes: {} })
  })

  it('only returns genre and mood when they differ', () => {
    const track = makeTrack({ genre: 'House', mood: 'Fiery' })
    expect(
      getBulkTrackEditChanges(track, { genre: 'House', mood: 'Fiery' }).changes
    ).toEqual({})
    expect(
      getBulkTrackEditChanges(track, { genre: 'Techno', mood: 'Easygoing' })
        .changes
    ).toEqual({ genre: 'Techno', mood: 'Easygoing' })
  })

  it('adds tags without duplicating existing ones', () => {
    const track = makeTrack({ tags: 'house,Deep' })
    const { changes } = getBulkTrackEditChanges(track, {
      tags: { mode: 'add', values: ['deep', 'summer'] }
    })
    expect(changes).toEqual({ tags: 'house,Deep,summer' })
  })

  it('makes no tag change when every added tag already exists', () => {
    const track = makeTrack({ tags: 'house,deep' })
    const { changes } = getBulkTrackEditChanges(track, {
      tags: { mode: 'add', values: ['HOUSE'] }
    })
    expect(changes).toEqual({})
  })

  it('caps added tags at the tag limit', () => {
    const existing = Array.from({ length: 9 }, (_, i) => `t${i}`)
    const track = makeTrack({ tags: existing.join(',') })
    const { changes } = getBulkTrackEditChanges(track, {
      tags: { mode: 'add', values: ['a', 'b', 'c'] }
    })
    const tags = (changes.tags as string).split(',')
    expect(tags).toHaveLength(BULK_EDIT_MAX_TAGS)
    expect(tags).toEqual([...existing, 'a'])
  })

  it('replaces tags', () => {
    const track = makeTrack({ tags: 'house,deep' })
    const { changes } = getBulkTrackEditChanges(track, {
      tags: { mode: 'replace', values: ['ambient'] }
    })
    expect(changes).toEqual({ tags: 'ambient' })
  })

  it('makes a free track premium with a default preview', () => {
    const { changes, priceSkipReason } = getBulkTrackEditChanges(makeTrack(), {
      price: { type: 'premium', priceCents: 199 }
    })
    expect(priceSkipReason).toBeUndefined()
    expect(changes).toEqual({
      is_stream_gated: true,
      stream_conditions: { usdc_purchase: { price: 199 } },
      is_download_gated: true,
      download_conditions: { usdc_purchase: { price: 199 } },
      is_downloadable: true,
      preview_start_seconds: 0
    })
  })

  it('keeps the album track price and preview when repricing', () => {
    const track = makeTrack({
      is_stream_gated: true,
      stream_conditions: premium(100, 50),
      preview_start_seconds: 42
    })
    const { changes } = getBulkTrackEditChanges(track, {
      price: { type: 'premium', priceCents: 300 }
    })
    expect(changes.stream_conditions).toEqual({
      usdc_purchase: { price: 300, albumTrackPrice: 50 }
    })
    expect(changes.preview_start_seconds).toBe(42)
  })

  it('makes no change when the price already matches', () => {
    const track = makeTrack({
      is_stream_gated: true,
      stream_conditions: premium(300)
    })
    expect(
      getBulkTrackEditChanges(track, {
        price: { type: 'premium', priceCents: 300 }
      })
    ).toEqual({ changes: {} })
  })

  it('skips the price on remixes but still applies other fields', () => {
    const track = makeTrack({
      remix_of: { tracks: [{ parent_track_id: 7 }] } as Track['remix_of']
    })
    expect(
      getBulkTrackEditChanges(track, {
        genre: 'Techno',
        price: { type: 'premium', priceCents: 199 }
      })
    ).toEqual({ changes: { genre: 'Techno' }, priceSkipReason: 'remix' })
  })

  it('removes the price from a premium track', () => {
    const track = makeTrack({
      is_stream_gated: true,
      stream_conditions: premium(300)
    })
    expect(
      getBulkTrackEditChanges(track, { price: { type: 'free' } }).changes
    ).toEqual({
      is_stream_gated: false,
      stream_conditions: null,
      is_download_gated: false,
      download_conditions: null,
      is_downloadable: false
    })
  })

  it('leaves follower-gated tracks alone when making tracks free', () => {
    const track = makeTrack({
      is_stream_gated: true,
      stream_conditions: { follow_user_id: 1 }
    })
    expect(getBulkTrackEditChanges(track, { price: { type: 'free' } })).toEqual(
      { changes: {}, priceSkipReason: 'special_access' }
    )
  })

  it('makes no change when a free track is made free', () => {
    expect(
      getBulkTrackEditChanges(makeTrack(), { price: { type: 'free' } })
    ).toEqual({ changes: {} })
  })
})

describe('hasBulkTrackEdit', () => {
  it('is false for an empty edit or empty tag list', () => {
    expect(hasBulkTrackEdit({})).toBe(false)
    expect(hasBulkTrackEdit({ tags: { mode: 'add', values: [] } })).toBe(false)
  })

  it('is true when any field is set', () => {
    expect(hasBulkTrackEdit({ genre: 'House' })).toBe(true)
    expect(hasBulkTrackEdit({ price: { type: 'free' } })).toBe(true)
  })
})
