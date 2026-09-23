import { TrackForUpload } from '@audius/common/store'
import { describe, expect, it } from 'vitest'

import { applyInitialMetadata } from './SelectPage'

const makeTrack = (): TrackForUpload =>
  ({
    file: new File(['a'], 'a.mp3'),
    preview: undefined,
    metadata: { title: 'a', genre: '' }
  }) as unknown as TrackForUpload

describe('applyInitialMetadata', () => {
  it('applies the seed to new tracks', () => {
    const [track] = applyInitialMetadata([makeTrack()], { genre: 'Electronic' })
    expect(track.metadata.genre).toBe('Electronic')
  })

  it('does not reapply the seed over later edits', () => {
    const [seeded] = applyInitialMetadata([makeTrack()], {
      genre: 'Electronic'
    })
    const edited = {
      ...seeded,
      metadata: { ...seeded.metadata, genre: 'Rock' }
    }
    const [result] = applyInitialMetadata([edited], { genre: 'Electronic' })
    expect(result.metadata.genre).toBe('Rock')
  })

  it('returns tracks unchanged without a seed', () => {
    const track = makeTrack()
    expect(applyInitialMetadata([track])[0]).toBe(track)
  })
})
