import { describe, expect, it, vi } from 'vitest'

import { TracksApi } from '../generated/default/apis/TracksApi'
import { Configuration } from '../generated/default/runtime'

// Exercise real HTTP serialization, including explicit false to cancel scheduling.
describe('track scheduling over REST', () => {
  it('preserves scheduling and the exact release time on create and update', async () => {
    for (const operation of ['create', 'update'] as const) {
      for (const isScheduledRelease of [true, false, undefined]) {
        const fetchApi = vi.fn<typeof fetch>().mockResolvedValue(
          new Response(JSON.stringify({ data: {} }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        const api = new TracksApi(new Configuration({ fetchApi }))
        const metadata = {
          title: 'Scheduled track',
          genre: 'Electronic',
          trackCid: 'test-cid',
          isScheduledRelease,
          releaseDate: new Date('2026-10-20T00:00:00-07:00')
        }
        if (operation === 'create') {
          await api.createTrack({ userId: 'owner', metadata })
        } else {
          await api.updateTrack({ userId: 'owner', trackId: 'track', metadata })
        }
        expect(fetchApi).toHaveBeenCalledOnce()
        const body = JSON.parse(String(fetchApi.mock.calls[0]?.[1]?.body))
        expect(body.release_date).toBe('2026-10-20T07:00:00.000Z')
        if (isScheduledRelease === undefined) {
          expect(body).not.toHaveProperty('is_scheduled_release')
        } else {
          expect(body.is_scheduled_release).toBe(isScheduledRelease)
        }
      }
    }
  })
})
