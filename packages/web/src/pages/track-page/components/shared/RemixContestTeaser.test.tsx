import {
  getEventIdsByEntityIdQueryKey,
  getEventQueryKey,
  getTrackQueryKey
} from '@audius/common/api'
import { FeatureFlags } from '@audius/common/services'
import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'
import { describe, expect } from 'vitest'

import { queryClient } from 'services/query-client'
import { render, screen, it } from 'test/test-utils'

import { RemixContestTeaser } from './RemixContestTeaser'

// Phase-5 teaser rendering is gated on the CONTESTS feature flag. Every test
// that expects the teaser to render must pass this option to `render()`.
const withContestsFlag = { featureFlags: { [FeatureFlags.CONTESTS]: true } }

// Minimal track shape; useTrack just returns whatever we put in the cache,
// and the teaser only reads `permalink` from it.
const makeTrack = (overrides: Record<string, any> = {}) =>
  ({
    track_id: 1,
    owner_id: 1,
    title: 'Ready To Love',
    permalink: '/Protohype/ready-to-love',
    is_delete: false,
    is_unlisted: false,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
    ...overrides
  }) as any

const makeContestEvent = (overrides: Record<string, any> = {}) =>
  ({
    eventId: 100,
    eventType: EventEventTypeEnum.RemixContest,
    entityType: EventEntityTypeEnum.Track,
    entityId: 1,
    userId: 1,
    endDate: '2099-12-31T23:59:00Z',
    eventData: {
      description: 'Remix my track',
      prizeInfo: '',
      winners: []
    },
    ...overrides
  }) as any

/**
 * Prime the React Query cache so that:
 *   - useTrack(1)                            → track
 *   - useEventIdsByEntityId({1, Track, RC})  → [eventId]
 *   - useEvent(eventId)                      → contest event
 *
 * The teaser uses `useRemixContest`, which is a thin composition of those
 * three hooks. Priming the cache directly avoids having to mock the SDK
 * batchers / MSW handlers for this one component.
 */
const primeContestCache = (
  track: ReturnType<typeof makeTrack>,
  contest: ReturnType<typeof makeContestEvent> | null
) => {
  queryClient.setQueryData(getTrackQueryKey(track.track_id), track)

  const eventIdsKey = getEventIdsByEntityIdQueryKey({
    entityId: track.track_id,
    entityType: EventEntityTypeEnum.Track,
    eventType: EventEventTypeEnum.RemixContest
  })
  if (contest) {
    queryClient.setQueryData(eventIdsKey, [contest.eventId])
    queryClient.setQueryData(getEventQueryKey(contest.eventId), contest)
  } else {
    queryClient.setQueryData(eventIdsKey, [])
  }
}

describe('RemixContestTeaser', () => {
  it('renders nothing when no remix contest event exists for the track', () => {
    const track = makeTrack()
    primeContestCache(track, null)

    render(<RemixContestTeaser trackId={track.track_id} />, withContestsFlag)

    // The teaser bails out with `return null`, so none of its identifying
    // elements should be present in the DOM. (We can't assert the container
    // is literally empty because the test harness injects shared <svg>
    // gradient defs globally.)
    expect(screen.queryByText('Remix Contest')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /view contest/i })
    ).not.toBeInTheDocument()
  })

  it('renders the CTA and links to /:handle/:slug/contest when a contest exists', () => {
    const track = makeTrack()
    primeContestCache(track, makeContestEvent())

    render(<RemixContestTeaser trackId={track.track_id} />, withContestsFlag)

    // Badge text is locked — the track page must always call this a
    // "Remix Contest" so users recognise the CTA.
    expect(screen.getByText('Remix Contest')).toBeInTheDocument()

    // The "View Contest" button is rendered as an anchor (Button asChild + Link).
    const link = screen.getByRole('link', { name: /view contest/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      '/Protohype/ready-to-love/contest'
    )
  })

  it('shows "Ends <date>" for an active contest', () => {
    const track = makeTrack()
    primeContestCache(
      track,
      makeContestEvent({ endDate: '2099-12-31T23:59:00Z' })
    )

    render(<RemixContestTeaser trackId={track.track_id} />, withContestsFlag)
    // The exact formatted date string depends on formatContestDeadline; we
    // don't couple the test to the format, only to the "Ends …" prefix so
    // the distinction between active and ended is covered.
    expect(screen.getByText(/^Ends /)).toBeInTheDocument()
  })

  it('shows "Contest ended" when the deadline has passed', () => {
    const track = makeTrack()
    primeContestCache(
      track,
      // A date well in the past — dayjs().isBefore(now) → ended.
      makeContestEvent({ endDate: '2000-01-01T00:00:00Z' })
    )

    render(<RemixContestTeaser trackId={track.track_id} />, withContestsFlag)
    expect(screen.getByText(/contest ended/i)).toBeInTheDocument()
  })

  it('renders nothing when the CONTESTS feature flag is OFF, even if a contest exists', () => {
    // The teaser piggybacks on the same flag that gates the /contests
    // discovery page and the dedicated /contest detail page. With the flag
    // off the target page is unreachable, so surfacing a CTA would be a
    // dead-end.
    const track = makeTrack()
    primeContestCache(track, makeContestEvent())

    render(<RemixContestTeaser trackId={track.track_id} />, {
      featureFlags: { [FeatureFlags.CONTESTS]: false }
    })

    expect(screen.queryByText('Remix Contest')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /view contest/i })
    ).not.toBeInTheDocument()
  })
})
