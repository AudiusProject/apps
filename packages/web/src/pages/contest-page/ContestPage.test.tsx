import { createRef, type RefObject } from 'react'

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
  useRemixesCount: vi.fn(),
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
    useRemixesCount: mocks.useRemixesCount,
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
    prizeInfo: 'Cash prizes for the top three!',
    winners: []
  }
}

const renderContestPage = () => {
  const containerRef = createRef<HTMLDivElement>()
  return render(
    <MemoryRouter initialEntries={['/Protohype/contest/ready-to-love']}>
      <Routes>
        <Route
          path='/:handle/contest/:slug'
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
      skipRouter: true
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
    mocks.useRemixesCount.mockReturnValue({ data: 0 })
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

  it('renders the skeleton fallback when the track has no remix contest', () => {
    mocks.useRemixContest.mockReturnValue({ data: null })
    const { container } = renderContestPage()
    // The page now renders a layout-shaped Skeleton instead of the old
    // "no contest is currently running" copy. Skeleton renders an
    // element with `aria-busy`, which is unique to that fallback branch.
    expect(container.querySelector('[aria-busy]')).not.toBeNull()
    // The main layout sections should NOT render in the fallback branch.
    expect(screen.queryByText(/^about this contest$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^prizes$/i)).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('contest-comments-section')
    ).not.toBeInTheDocument()
  })

  it('renders the details / prizes / submissions / feed sections when a contest exists', () => {
    // Provide a non-empty lineup so the Submissions pill renders. The
    // lineup is [original, ...winners, ...remixes], and submissionsCount
    // subtracts the original + winners, so we need at least 2 entries
    // (the original plus one actual submission) for the pill to show.
    mocks.useRemixesLineup.mockReturnValue({
      data: [{ id: 1 }, { id: 2 }],
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
    // Submissions pill reads from the count-only API query, not the
    // lineup length — so the test needs a non-zero count for the pill
    // to render.
    mocks.useRemixesCount.mockReturnValue({ data: 1 })
    renderContestPage()

    // About + Prizes are now rendered as uppercase label-style section
    // headings, not <h*> headings. Match by visible text instead.
    expect(screen.getByText(/^about this contest$/i)).toBeInTheDocument()
    expect(screen.getByText(/^prizes$/i)).toBeInTheDocument()

    // Submissions is surfaced as a SelectablePill toggle.
    expect(
      screen.getByRole('button', { name: /^submissions( \(\d+\))?$/i })
    ).toBeInTheDocument()

    // Contest details internals differ across desktop/mobile layouts.
    // The redesigned layout renders TWO ContestCommentsTile instances:
    // one in mode='updates' (left column, Updates feed) and one for the
    // regular comments feed (right column).
    expect(screen.getAllByTestId('contest-comments-section')).toHaveLength(2)
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

  it('does not flash "Follow" while the follow state is still loading', () => {
    // Mid-flight: no data yet. The button must not render the unfollowed
    // "Follow" label, otherwise it flashes before snapping to "Following"
    // for users who already follow the contest.
    mocks.useEventFollowState.mockReturnValue({
      data: undefined,
      isPending: true
    })
    renderContestPage()

    expect(
      screen.queryByRole('button', { name: /^follow$/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^following$/i })
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
