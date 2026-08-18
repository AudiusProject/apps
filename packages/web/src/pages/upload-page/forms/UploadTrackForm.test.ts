import { TrackMetadataForUpload } from '@audius/common/store'
import { describe, expect, it } from 'vitest'

import { getTrackEditInitialMetadata } from './UploadTrackForm'

const makeMetadata = (
  overrides: Partial<TrackMetadataForUpload> = {}
): TrackMetadataForUpload =>
  ({
    title: 'leftover szn - Run It Back',
    genre: 'Electronic',
    ...overrides
  }) as TrackMetadataForUpload

describe('getTrackEditInitialMetadata', () => {
  it('seeds blank values for a fresh upload', () => {
    const result = getTrackEditInitialMetadata(makeMetadata())

    expect(result.description).toBe('')
    expect(result.tags).toBe('')
    expect(result.stems).toEqual([])
    expect(result.isrc).toBe('')
    expect(result.iswc).toBe('')
    expect(result.field_visibility).toEqual({
      genre: true,
      mood: true,
      tags: true,
      share: false,
      play_count: false,
      remixes: true
    })
  })

  it('seeds from initialMetadata when the track has nothing yet', () => {
    const result = getTrackEditInitialMetadata(makeMetadata(), {
      description: 'seeded description',
      tags: 'seeded,tags'
    })

    expect(result.description).toBe('seeded description')
    expect(result.tags).toBe('seeded,tags')
  })

  // Regression: EditTrackForm runs with `enableReinitialize`, and
  // `formState.tracks` is rewritten with the user's edits on every submit. When
  // this function blanked description/tags unconditionally, that reset wiped
  // them and the track published with no description and no tags.
  it('preserves user-entered values when the form reinitializes', () => {
    const edited = makeMetadata({
      description: 'Stream elsewhere & follow on IG',
      tags: 'dubstep,bassmusic,bass',
      isrc: 'USX9P1234567',
      iswc: 'T-123.456.789-0',
      stems: [{ metadata: {} } as any],
      collaborators: [{ user_id: 12345 } as any]
    })

    const result = getTrackEditInitialMetadata(edited)

    expect(result.description).toBe('Stream elsewhere & follow on IG')
    expect(result.tags).toBe('dubstep,bassmusic,bass')
    expect(result.isrc).toBe('USX9P1234567')
    expect(result.iswc).toBe('T-123.456.789-0')
    expect(result.stems).toHaveLength(1)
    expect(result.collaborators).toEqual([{ user_id: 12345 }])
  })

  it('preserves a user-disabled remixes visibility across reinitialization', () => {
    const result = getTrackEditInitialMetadata(
      makeMetadata({
        field_visibility: {
          genre: true,
          mood: true,
          tags: true,
          share: false,
          play_count: false,
          remixes: false
        }
      })
    )

    expect(result.field_visibility?.remixes).toBe(false)
  })

  it('is stable across repeated calls so the form does not reset spuriously', () => {
    const metadata = makeMetadata({ description: 'kept', tags: 'a,b' })

    expect(getTrackEditInitialMetadata(metadata)).toEqual(
      getTrackEditInitialMetadata(metadata)
    )
  })
})
