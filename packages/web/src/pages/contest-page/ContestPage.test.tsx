import { createRef, type RefObject } from 'react'

import { FeatureFlags } from '@audius/common/services'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, vi, beforeEach } from 'vitest'

import { render, screen, it } from 'test/test-utils'

// Import the page AFTER all the mocks are registered.
import ContestPage from './ContestPage'

// We mock the `@audius/common/api` surface for ContestPage because the page
// reads from 9 hooks whose combined state would be painful to prime through
// the React Query cache. The test here is focused on the page's RENDERING
// logic given the hook return values — follow/unfollow behaviour through
// useRequiresAccountCallback is exercised by its own dedicated tests.

const mocks = vi.hoisted(() => ({
  // Data the test will override per-test
  useTrackByPermalink: vi.fn(),
  useUser: vi.fn(),
  useRemixContest: vi.fn(),
  useCurrentUserId: vi.fn(),
  useEventFollowState: vi.fn(),
  useFollowEvent: vi.fn(),
  useUnfollowEvent: vi.fn(),
  useRemixesLineup: vi.fn(),
  useRemixersCount: vi.fn(),
  useComment: vi.fn(),
  useEventComments: vi.fn(),
  usePostEventComment: vi.fn()
}))

vi.mock('@audius/common/api', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    useTrackByPermalink: mocks.useTrackByPermalink,
    useUser: mocks.useUser,
    useRemixContest: mocks.useRemixContest,
    useCurrentUserId: mocks.useCurrentUserId,
    useEventFollowState: mocks.useEventFollowState,
    useFollowEvent: mocks.useFollowEvent,
    useUnfollowEvent: mocks.useUnfollowEvent,
    useRemixesLineup: mocks.useRemixesLineup,
    useRemixersCount: mocks.useRemixersCount,
    useComment: mocks.useComment,
    useEventComments: mocks.useEventComments,
    usePostEventComment: mocks.usePostEventComment
  }
})

// The header decorator renders a Link using useRequiresAccountCallback,
// which depends on account-status queries. Stub the hook out entirely — the
// follow flow's real behaviour is covered upstream in Phase 2 Go/Python tests.
vi.mock('hooks/useRequiresAccount', async () => {
  return {
    useRequiresAccountCallback: (cb: (...args: any) => any) => cb
  }
})

// TanQueryLineup pulls in a giant subtree of player state and lineup sagas
// that we don't care about here — stub it with a tiny marker component.
vi.mock('components/lineup/TanQueryLineup', () => ({
  TanQueryLineup: () => <div data-testid='tan-query-lineup' />
}))

// The nested remix-contest details/prizes tabs are verified by their own
// tests upstream. Here they're irrelevant layout fillers; stub them.
vi.mock('pages/track-page/components/desktop/RemixContestDetailsTab', () => ({
  RemixContestDetailsTab: () => <div data-testid='details-tab' />
}))
vi.mock('pages/track-page/components/desktop/RemixContestPrizesTab', () => ({
  RemixContestPrizesTab: () => <div data-testid='prizes-tab' />
}))

// The comments feed is its own universe — stub with a marker. (Phase 4/5
// tests cover the feed directly.)
vi.mock('./components/ContestCommentsTile', () => ({
  ContestCommentsTile: () => <div data-testid='contest-comments-section' />
}))

const track = {
  track_id: 1,
  owner_id: 1,
  title: 'Ready To Love',
  permalink: '/Protohype/ready-to-love',
  is_delete: false,
  is_unlisted: false
}

const user = { user_id: 1, handle: 'Protohype', name: 'Protohype' }

const contest = {
  eventId: 100,
  userId: 1,
  eventType: 'RemixContest',
  entityType: 'Track',
  entityId: 1,
  endDate: '2099-12-31T23:59:00Z',
  eventData: {
    description: 'Remix my track',
    prizeInfo: '',
    winners: []
  }
}

const renderContestPage = (opts?: {
  featureFlags?: Partial<Record<FeatureFlags, boolean>>
}) => {
  const containerRef = createRef<HTMLDivElement>()
  return render(
    <MemoryRouter initialEntries={['/Protohype/ready-to-love/contest']}>
      <Routes>
        <Route
          path='/:handle/:slug/contest'
          element={
            <ContestPage
              containerRef={containerRef as RefObject<HTMLDivElement>}
            />
          }
        />
        {/* '/' route for any Navigate targets that tests may add later. */}
        <Route path='/' element={<div data-testid='home-page' />} />
      </Routes>
    </MemoryRouter>,
    {
      skipRouter: true,
      featureFlags: { [FeatureFlags.CONTESTS]: true, ...opts?.featureFlags },
      // The page guards the flag check on `isLoaded` to avoid flicker during
      // remote-config hydration in prod. In tests we've already set the
      // flag value, so mark the config as loaded so the guard fires.
      reduxState: { remoteConfig: { remoteConfigLoaded: true } }
    }
  )
}

describe('ContestPage', () => {
  beforeEach(() => {
    // Sensible defaults every test can override.
    mocks.useTrackByPermalink.mockReturnValue({ data: track })
    mocks.useUser.mockReturnValue({ data: user })
    mocks.useRemixContest.mockReturnValue({ data: contest })
    mocks.useCurrentUserId.mockReturnValue({ data: 2 })
    mocks.useEventFollowState.mockReturnValue({
      data: { isFollowed: false, followerCount: 0 }
    })
    mocks.useFollowEvent.mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    })
    mocks.useUnfollowEvent.mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    })
    mocks.useRemixesLineup.mockReturnValue({
      data: undefined,
      isFetching: false,
      isPending: false,
      isError: false,
      hasNextPage: false,
      play: vi.fn(),
      pause: vi.fn(),
      loadNextPage: vi.fn(),
      isPlaying: false,
      lineup: { entries: [], order: {} }
    })
    mocks.useRemixersCount.mockReturnValue({ data: 0 })
    mocks.useEventComments.mockReturnValue({
      data: [],
      isPending: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false
    })
    mocks.usePostEventComment.mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    })
  })

  it('renders nothing while the track is still loading', () => {
    mocks.useTrackByPermalink.mockReturnValue({ data: undefined })
    mocks.useUser.mockReturnValue({ data: undefined })
    const { container } = renderContestPage()
    // The page bails out with `return null` when the track or user hasn't
    // resolved yet, so the router outlet is effectively empty.
    expect(container.querySelector('[data-testid="details-tab"]')).toBeNull()
    expect(container.querySelector('[data-testid="prizes-tab"]')).toBeNull()
  })

  it('renders the "no contest" fallback when the track has no remix contest', () => {
    mocks.useRemixContest.mockReturnValue({ data: null })
    renderContestPage()
    expect(
      screen.getByText(/no contest is currently running for this track/i)
    ).toBeInTheDocument()
    // The main layout sections should NOT render in the fallback branch.
    expect(screen.queryByTestId('details-tab')).not.toBeInTheDocument()
    expect(screen.queryByTestId('prizes-tab')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('contest-comments-section')
    ).not.toBeInTheDocument()
  })

  it('renders the details / prizes / submissions / feed sections when a contest exists', () => {
    // Provide a non-empty lineup so the Submissions pill renders (the
    // tab toggle is hidden while no submissions exist).
    mocks.useRemixesLineup.mockReturnValue({
      data: [{ id: 1 }],
      isFetching: false,
      isPending: false,
      isError: false,
      hasNextPage: false,
      play: vi.fn(),
      pause: vi.fn(),
      loadNextPage: vi.fn(),
      isPlaying: false,
      lineup: { entries: [], order: {} }
    })
    renderContestPage()

    // About + Prizes are now rendered as uppercase label-style section
    // headings, not <h*> headings. Match by visible text instead.
    expect(screen.getByText(/^about this contest$/i)).toBeInTheDocument()
    expect(screen.getByText(/^prizes$/i)).toBeInTheDocument()

    // Submissions is surfaced as a SelectablePill toggle.
    expect(
      screen.getByRole('button', { name: /^submissions( \(\d+\))?$/i })
    ).toBeInTheDocument()

    // Stubbed subsections rendered by the Details tab
    expect(screen.getByTestId('details-tab')).toBeInTheDocument()
    expect(screen.getByTestId('prizes-tab')).toBeInTheDocument()
    // The details tab now renders a single ContestCommentsTile in the
    // right column (matches Figma node 2857-99124). The Updates feed
    // isn't in the Figma — the Phase-2 host-updates tile was removed
    // for parity and will come back as its own separate design once
    // specced.
    expect(screen.getAllByTestId('contest-comments-section')).toHaveLength(1)
    // The submissions lineup lives under the Submissions tab, not the
    // Details tab; it renders after flipping the pill.
    expect(screen.queryByTestId('tan-query-lineup')).not.toBeInTheDocument()
  })

  it('renders "Follow" when the viewer is NOT already following', () => {
    mocks.useEventFollowState.mockReturnValue({
      data: { isFollowed: false, followerCount: 12 }
    })
    renderContestPage()

    // The Figma-aligned public header surfaces a notification-style
    // Follow pill (bell icon). Copy is just "Follow" / "Following".
    expect(
      screen.getByRole('button', { name: /^follow$/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^following$/i })
    ).not.toBeInTheDocument()
  })

  it('renders "Following" when the viewer is already subscribed to the contest', () => {
    mocks.useEventFollowState.mockReturnValue({
      data: { isFollowed: true, followerCount: 13 }
    })
    renderContestPage()

    expect(
      screen.getByRole('button', { name: /^following$/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^follow$/i })
    ).not.toBeInTheDocument()
  })

  it('includes the track title in the page header when the contest is attached to a track', () => {
    renderContestPage()
    // The redesigned hero composes the display title as
    // "<track title> Remix Contest" (track title first, then the label),
    // rather than the old "Remix Contest: <title>" form.
    expect(
      screen.getByText(/Ready To Love\s+Remix Contest/i)
    ).toBeInTheDocument()
  })
})
