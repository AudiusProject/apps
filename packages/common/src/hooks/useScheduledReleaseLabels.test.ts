import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AccessType } from '~/models/AccessType'

import { useCollectionAccessTypeLabel } from './useCollectionAccessTypeLabel'
import { useTrackAccessTypeLabel } from './useTrackAccessTypeLabel'

const { metadata } = vi.hoisted(() => ({
  metadata: {
    is_scheduled_release: false,
    release_date: undefined as string | undefined,
    is_unlisted: false,
    is_private: false
  }
}))

vi.mock('~/api', () => ({
  useCurrentUserId: () => ({ data: 1 }),
  useTrack: (_id: number, options: { select: (data: unknown) => unknown }) => ({
    data: options.select(metadata)
  }),
  useCollection: (
    _id: number,
    options: { select: (data: unknown) => unknown }
  ) => ({ data: options.select(metadata) })
}))
vi.mock('./useGatedContent', () => ({
  useGatedTrackAccess: () => ({}),
  useGatedCollectionAccess: () => ({})
}))

for (const [name, useLabel] of [
  ['track', useTrackAccessTypeLabel],
  ['collection', useCollectionAccessTypeLabel]
] as const) {
  describe(`${name} scheduled release label`, () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-19T19:00:00Z'))
      Object.assign(metadata, {
        is_scheduled_release: false,
        release_date: '2026-10-20T07:00:00Z',
        is_unlisted: false,
        is_private: false
      })
    })
    afterEach(() => vi.useRealTimers())

    it('does not label a public future-dated release as scheduled', () => {
      expect(useLabel(1).type).toBeNull()
      expect(useLabel(1).scheduledReleaseDate).toBeUndefined()
    })

    it('labels an upcoming scheduled release', () => {
      metadata.is_scheduled_release = true
      expect(useLabel(1).type).toBe(AccessType.SCHEDULED_RELEASE)
      expect(useLabel(1).scheduledReleaseDate).toBe(metadata.release_date)
    })

    it.each(['2026-10-18T07:00:00Z', '2026-10-19T19:00:00Z', undefined])(
      'does not label a released or undated item as upcoming (%s)',
      (releaseDate) => {
        metadata.is_scheduled_release = true
        metadata.release_date = releaseDate
        expect(useLabel(1).type).toBeNull()
        expect(useLabel(1).scheduledReleaseDate).toBeUndefined()
      }
    )

    it('preserves the hidden label for an unscheduled future-dated item', () => {
      metadata.is_unlisted = true
      metadata.is_private = true
      expect(useLabel(1).type).toBe(AccessType.HIDDEN)
    })
  })
}
